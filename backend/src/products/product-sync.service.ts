import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WooCommerceService,
  WooCommerceProduct,
} from '../woocommerce/woocommerce.service';
import { Product } from '../entities/product.entity';


export interface SyncResult {
  success: boolean;
  totalProducts: number;
  newProducts: number;
  updatedProducts: number;
  errors: string[];
  duration: number;
}

export interface SyncOptions {
  forceUpdate?: boolean;
  batchSize?: number;
  maxRetries?: number;
}

export interface SyncProgress {
  syncId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  totalProducts: number;
  processedProducts: number;
  successfulProducts: number;
  failedProducts: number;
  skippedProducts: number;
  currentProduct?: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
  estimatedTimeRemaining?: number;
}

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);
  private activeSyncs = new Map<string, SyncProgress>();

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    private wooCommerceService: WooCommerceService,
  ) {}
  
  /**
   * Add a new sync progress to track
   */
  addSyncProgress(syncId: string, progress: SyncProgress): void {
    this.activeSyncs.set(syncId, progress);
    this.logger.log(`Added sync progress tracking for ${syncId}`);
  }

  /**
   * Sync all products from WooCommerce
   */
  async syncAllProducts(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const { batchSize = 100, maxRetries = 3 } = options;

    const result: SyncResult = {
      success: false,
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      errors: [],
      duration: 0,
    };

    try {
      this.logger.log('Starting WooCommerce product sync...');

      // Test connection first
      const isConnected = await this.wooCommerceService.testConnection();
      if (!isConnected) {
        throw new Error('WooCommerce connection failed');
      }

      let page = 1;
      let hasMoreProducts = true;

      while (hasMoreProducts) {
        try {
          const response =
            await this.wooCommerceService.getProductsWithPagination(
              page,
              batchSize,
            );

          const products = response.products;
          result.totalProducts += products.length;

          if (products.length === 0) {
            hasMoreProducts = false;
            break;
          }

          // Process products in batch
          for (const wooProduct of products) {
            try {
              const syncProductResult = await this.syncSingleProduct(
                wooProduct,
                options,
              );
              if (syncProductResult.isNew) {
                result.newProducts++;
              } else if (syncProductResult.isUpdated) {
                result.updatedProducts++;
              }
            } catch (error) {
              this.logger.error(
                `Error syncing product ${wooProduct.id}:`,
                error.message,
              );
              result.errors.push(`Product ${wooProduct.id}: ${error.message}`);
            }
          }

          // Check if we have more pages
          hasMoreProducts = response.pagination.hasNextPage;
          page++;

          this.logger.log(
            `Processed page ${page - 1}/${response.pagination.totalPages} - ` +
              `${products.length} products`,
          );

          // Add small delay to avoid rate limiting
          await this.delay(500);
        } catch (error) {
          this.logger.error(`Error processing page ${page}:`, error.message);
          result.errors.push(`Page ${page}: ${error.message}`);

          if (maxRetries > 0) {
            this.logger.log(`Retrying page ${page}...`);
            await this.delay(2000);
            continue;
          } else {
            hasMoreProducts = false;
          }
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      this.logger.log(
        `Sync completed: ${result.newProducts} new, ${result.updatedProducts} updated, ` +
          `${result.errors.length} errors in ${result.duration}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error('Sync failed:', error.message);
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Sync a single product from WooCommerce
   */
  async syncSingleProduct(
    wooProduct: WooCommerceProduct,
    options: SyncOptions = {},
  ): Promise<{ isNew: boolean; isUpdated: boolean; product: Product }> {
    const { forceUpdate = false } = options;

    try {
      // Check if product already exists
      let existingProduct = await this.productRepository.findOne({
        where: { woo_product_id: wooProduct.id },
      });

      // If not found by WooCommerce ID, try by SKU
      if (!existingProduct && wooProduct.sku) {
        existingProduct = await this.productRepository.findOne({
          where: { stok_kodu: wooProduct.sku },
        });
        
        // If found by SKU, update the WooCommerce ID to link them
        if (existingProduct && !existingProduct.woo_product_id) {
          existingProduct.woo_product_id = wooProduct.id;
          await this.productRepository.save(existingProduct);
          this.logger.log(
            `Linked existing product ${existingProduct.id} (${existingProduct.stok_kodu}) with WooCommerce ID ${wooProduct.id}`
          );
        }
      }

      const isNew = !existingProduct;
      let isUpdated = false;

      if (isNew) {
        // Create new product
        const newProduct = await this.createProductFromWooCommerce(wooProduct);

        return { isNew: true, isUpdated: false, product: newProduct };
      } else if (existingProduct) {
        // Skip updating existing products to preserve supplier prices and stock information
        // Only link the WooCommerce ID if it's missing
        this.logger.log(
          `Skipping update for existing product ${existingProduct.id} (${existingProduct.stok_kodu}) to preserve local data`
        );
        return { isNew: false, isUpdated: false, product: existingProduct };
      } else {
        // This should not happen, but handle it gracefully
        const newProduct = await this.createProductFromWooCommerce(wooProduct);

        return { isNew: true, isUpdated: false, product: newProduct };
      }
    } catch (error) {
      this.logger.error(
        `Error syncing product ${wooProduct.id}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Create a new product from WooCommerce data
   */
  private async createProductFromWooCommerce(
    wooProduct: WooCommerceProduct,
  ): Promise<Product> {
    const product = new Product();

    product.woo_product_id = wooProduct.id;
    product.stok_kodu = wooProduct.sku || `WOO-${wooProduct.id}`;
    product.urun_adi = wooProduct.name;
    product.stok_miktari = wooProduct.stock_quantity || 0;
    product.regular_price = parseFloat(wooProduct.price) || 0;
    product.regular_price = parseFloat(wooProduct.regular_price) || 0;
    product.sale_price = parseFloat(wooProduct.sale_price) || 0;
    product.manage_stock = wooProduct.manage_stock;
    product.stock_status = wooProduct.stock_status;
    product.categories = wooProduct.categories || [];
    product.images = wooProduct.images || [];
    // Convert WooCommerce tags to supplier_tags
    product.supplier_tags = wooProduct.tags ? wooProduct.tags.map(tag => tag.name) : [];
    product.woo_date_created = new Date(wooProduct.date_created);
    product.woo_date_modified = new Date(wooProduct.date_modified);
    product.last_sync_date = new Date();
    product.sync_required = false;
    product.is_active = true;

    return await this.productRepository.save(product);
  }

  /**
   * Update existing product with WooCommerce data
   */
  private async updateProductFromWooCommerce(
    existingProduct: Product,
    wooProduct: WooCommerceProduct,
  ): Promise<Product> {
    // Preserve existing price and stock information - only update other fields
    // This ensures that local panel data takes precedence over WooCommerce data
    
    // Update product fields (excluding price and stock)
    // WooCommerce ID is already set during the linking process, no need to update again
    existingProduct.urun_adi = wooProduct.name;
    // Keep existing stock and price values - DO NOT update from WooCommerce
    // existingProduct.stok_miktari = wooProduct.stock_quantity || 0;
    // existingProduct.regular_price = parseFloat(wooProduct.price) || 0;
    // existingProduct.sale_price = parseFloat(wooProduct.sale_price) || 0;
    // existingProduct.manage_stock = wooProduct.manage_stock;
    // existingProduct.stock_status = wooProduct.stock_status;
    
    existingProduct.categories = wooProduct.categories || [];
    existingProduct.images = wooProduct.images || [];
    // Keep existing supplier_tags - DO NOT update from WooCommerce
    // existingProduct.supplier_tags = wooProduct.tags ? wooProduct.tags.map(tag => tag.name) : [];
    existingProduct.woo_date_modified = new Date(wooProduct.date_modified);
    existingProduct.last_sync_date = new Date();
    existingProduct.sync_required = false;
    existingProduct.is_active = true;

    const updatedProduct = await this.productRepository.save(existingProduct);

    this.logger.log(
      `Updated product ${existingProduct.id} from WooCommerce (preserved local price and stock data)`
    );

    return updatedProduct;
  }

  /**
   * Check if product should be updated
   * Note: Price and stock differences are ignored as local data takes precedence
   */
  private shouldUpdateProduct(
    existingProduct: Product,
    wooProduct: WooCommerceProduct,
  ): boolean {
    const wooModified = new Date(wooProduct.date_modified);
    const lastSync = existingProduct.last_sync_date;

    // Update if WooCommerce product was modified after last sync
    if (!lastSync || wooModified > new Date(lastSync)) {
      return true;
    }

    // Update if sync is required
    if (existingProduct.sync_required) {
      return true;
    }

    // Check for differences in non-price/stock fields
    const nameDiff = existingProduct.urun_adi !== wooProduct.name;
    const categoriesDiff = JSON.stringify(existingProduct.categories || []) !== JSON.stringify(wooProduct.categories || []);
    const imagesDiff = JSON.stringify(existingProduct.images || []) !== JSON.stringify(wooProduct.images || []);
    // Tags are also preserved, so no need to check for tag differences
    // const tagsDiff = JSON.stringify(existingProduct.supplier_tags || []) !== JSON.stringify(wooProduct.tags ? wooProduct.tags.map(tag => tag.name) : []);

    // Only update if non-price/stock/tag fields have changed
    return nameDiff || categoriesDiff || imagesDiff;
  }



  /**
   * Get products that need sync
   */
  async getProductsNeedingSync(limit = 100): Promise<Product[]> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return await this.productRepository
      .createQueryBuilder('product')
      .where('product.sync_required = :syncRequired', { syncRequired: true })
      .orWhere('product.last_sync_date IS NULL')
      .orWhere('product.last_sync_date < :oneDayAgo', { oneDayAgo })
      .orderBy('product.last_sync_date', 'ASC', 'NULLS FIRST')
      .limit(limit)
      .getMany();
  }

  /**
   * Mark products for sync
   */
  async markProductsForSync(productIds: number[]): Promise<void> {
    await this.productRepository
      .createQueryBuilder()
      .update(Product)
      .set({ sync_required: true })
      .where('id IN (:...productIds)', { productIds })
      .execute();
  }

  /**
   * Start batch sync with progress tracking
   */
  async startBatchSync(options: SyncOptions = {}): Promise<string> {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { batchSize = 100 } = options;

    // Initialize progress tracking
    const progress: SyncProgress = {
      syncId,
      status: 'running',
      totalProducts: 0,
      processedProducts: 0,
      successfulProducts: 0,
      failedProducts: 0,
      skippedProducts: 0,
      startTime: new Date(),
      errors: [],
    };

    this.activeSyncs.set(syncId, progress);

    // Start async sync process
    this.performBatchSync(syncId, options).catch((error) => {
      this.logger.error(`Batch sync ${syncId} failed:`, error.message);
      const currentProgress = this.activeSyncs.get(syncId);
      if (currentProgress) {
        currentProgress.status = 'failed';
        currentProgress.endTime = new Date();
        currentProgress.errors.push(error.message);
      }
    });

    return syncId;
  }

  /**
   * Get sync progress
   */
  async getSyncProgress(syncId: string): Promise<SyncProgress | null> {
    return this.activeSyncs.get(syncId) || null;
  }

  /**
   * Cancel sync
   */
  async cancelSync(syncId: string): Promise<boolean> {
    const progress = this.activeSyncs.get(syncId);
    if (progress && (progress.status === 'running' || progress.status === 'paused')) {
      progress.status = 'cancelled';
      progress.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * Pause sync
   */
  async pauseSync(syncId: string): Promise<boolean> {
    const progress = this.activeSyncs.get(syncId);
    if (progress && progress.status === 'running') {
      progress.status = 'paused';
      this.logger.log(`Sync ${syncId} paused`);
      return true;
    }
    return false;
  }

  /**
   * Resume sync
   */
  async resumeSync(syncId: string): Promise<boolean> {
    const progress = this.activeSyncs.get(syncId);
    if (progress && progress.status === 'paused') {
      progress.status = 'running';
      this.logger.log(`Sync ${syncId} resumed`);
      // Continue the batch sync process
      this.performBatchSync(syncId, {}).catch(error => {
        this.logger.error(`Error resuming sync ${syncId}:`, error.message);
      });
      return true;
    }
    return false;
  }

  /**
   * Perform batch sync with progress tracking
   */
  private async performBatchSync(syncId: string, options: SyncOptions = {}): Promise<void> {
    let progress = this.activeSyncs.get(syncId);
    if (!progress) {
      throw new Error(`Sync ${syncId} not found`);
    }

    const { batchSize = 100, maxRetries = 3 } = options;

    try {
      this.logger.log(`Starting batch sync ${syncId}...`);

      // Test connection first
      const isConnected = await this.wooCommerceService.testConnection();
      if (!isConnected) {
        throw new Error('WooCommerce connection failed');
      }

      // Get total product count first
      const totalResponse = await this.wooCommerceService.getProductsWithPagination(1, 1);
      progress.totalProducts = totalResponse.pagination.totalProducts;

      let page = 1;
      let hasMoreProducts = true;
      const startTime = Date.now();

      while (hasMoreProducts && (progress.status === 'running' || progress.status === 'paused')) {
        // Wait if paused
        while (progress && progress.status === 'paused') {
          await this.delay(1000); // Check every second
          const currentProgress = this.activeSyncs.get(syncId);
          if (!currentProgress || currentProgress.status === 'cancelled') {
            return;
          }
          progress = currentProgress;
        }
        
        if (progress.status !== 'running') {
          break;
        }
        try {
          const response = await this.wooCommerceService.getProductsWithPagination(page, batchSize);
          const products = response.products;

          if (products.length === 0) {
            hasMoreProducts = false;
            break;
          }

          // Process products in batch
          for (const wooProduct of products) {
            if (progress.status !== 'running') {
              break;
            }
            
            // Wait if paused
            while (progress && progress.status === 'paused') {
              await this.delay(1000);
              const currentProgress = this.activeSyncs.get(syncId);
              if (!currentProgress || currentProgress.status === 'cancelled') {
                return;
              }
              progress = currentProgress;
            }

            progress.currentProduct = wooProduct.name;

            try {
              const result = await this.syncSingleProduct(wooProduct, options);
              if (result.isNew || result.isUpdated) {
                progress.successfulProducts++;
              } else {
                progress.skippedProducts++;
              }
            } catch (error) {
              progress.failedProducts++;
              progress.errors.push(`Product ${wooProduct.name}: ${error.message}`);
              this.logger.error(`Error syncing product ${wooProduct.id}:`, error.message);
            }

            progress.processedProducts++;

            // Calculate estimated time remaining
            const elapsed = Date.now() - startTime;
            const avgTimePerProduct = elapsed / progress.processedProducts;
            const remainingProducts = progress.totalProducts - progress.processedProducts;
            progress.estimatedTimeRemaining = Math.round(avgTimePerProduct * remainingProducts);

            // Small delay to prevent overwhelming the system
            await this.delay(50);
          }

          page++;

          // Check if we have more products
          hasMoreProducts = page <= response.pagination.totalPages;

          // Longer delay between pages
          await this.delay(200);
        } catch (error) {
          this.logger.error(`Error processing page ${page}:`, error.message);
          progress.errors.push(`Page ${page}: ${error.message}`);
          
          // Retry logic for page failures
          let retryCount = 0;
          while (retryCount < maxRetries && progress.status === 'running') {
            try {
              await this.delay(1000 * (retryCount + 1)); // Exponential backoff
              const retryResponse = await this.wooCommerceService.getProductsWithPagination(page, batchSize);
              // If successful, continue with next page
              break;
            } catch (retryError) {
              retryCount++;
              if (retryCount >= maxRetries) {
                throw new Error(`Failed to process page ${page} after ${maxRetries} retries`);
              }
            }
          }
        }
      }

      // Mark as completed
      if (progress.status === 'running') {
        progress.status = 'completed';
      }
      progress.endTime = new Date();
      progress.currentProduct = undefined;

      this.logger.log(
        `Batch sync ${syncId} completed: ${progress.successfulProducts} successful, ${progress.failedProducts} failed`,
      );

      // Clean up old sync records after 1 hour
      setTimeout(() => {
        this.activeSyncs.delete(syncId);
      }, 60 * 60 * 1000);

    } catch (error) {
      progress.status = 'failed';
      progress.endTime = new Date();
      progress.errors.push(error.message);
      this.logger.error(`Batch sync ${syncId} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get all active syncs
   */
  async getActiveSyncs(): Promise<SyncProgress[]> {
    return Array.from(this.activeSyncs.values());
  }
  


  /**
   * Clean up completed syncs older than specified time
   */
  async cleanupOldSyncs(olderThanHours = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [syncId, progress] of this.activeSyncs.entries()) {
      if (progress.endTime && progress.endTime < cutoffTime) {
        this.activeSyncs.delete(syncId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
