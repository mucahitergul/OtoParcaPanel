import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WooCommerceService,
  WooCommerceProduct,
} from '../woocommerce/woocommerce.service';
import { Product } from '../entities/product.entity';
import { UpdateHistory } from '../entities/update-history.entity';

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

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(UpdateHistory)
    private updateHistoryRepository: Repository<UpdateHistory>,
    private wooCommerceService: WooCommerceService,
  ) {}

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
      }

      const isNew = !existingProduct;
      let isUpdated = false;

      if (isNew) {
        // Create new product
        const newProduct = await this.createProductFromWooCommerce(wooProduct);
        await this.createUpdateHistory(newProduct, 'WooCommerce', 'create', {
          woo_product_id: wooProduct.id,
          action: 'created_from_woocommerce',
        });
        return { isNew: true, isUpdated: false, product: newProduct };
      } else if (existingProduct) {
        // Update existing product if needed
        if (
          forceUpdate ||
          this.shouldUpdateProduct(existingProduct, wooProduct)
        ) {
          const updatedProduct = await this.updateProductFromWooCommerce(
            existingProduct,
            wooProduct,
          );
          isUpdated = true;
          return { isNew: false, isUpdated: true, product: updatedProduct };
        }
        return { isNew: false, isUpdated: false, product: existingProduct };
      } else {
        // This should not happen, but handle it gracefully
        const newProduct = await this.createProductFromWooCommerce(wooProduct);
        await this.createUpdateHistory(newProduct, 'WooCommerce', 'create', {
          woo_product_id: wooProduct.id,
          action: 'created_from_woocommerce_fallback',
        });
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
      product.fiyat = parseFloat(wooProduct.price) || 0;
    product.regular_price = parseFloat(wooProduct.regular_price) || 0;
    product.sale_price = parseFloat(wooProduct.sale_price) || 0;
    product.manage_stock = wooProduct.manage_stock;
    product.stock_status = wooProduct.stock_status;
    product.categories = wooProduct.categories || [];
    product.images = wooProduct.images || [];
    product.woo_date_created = new Date(wooProduct.date_created);
    product.woo_date_modified = new Date(wooProduct.date_modified);
    product.last_sync_date = new Date();
    product.sync_required = false;

    return await this.productRepository.save(product);
  }

  /**
   * Update existing product with WooCommerce data
   */
  private async updateProductFromWooCommerce(
    existingProduct: Product,
    wooProduct: WooCommerceProduct,
  ): Promise<Product> {
    const oldPrice = existingProduct.fiyat;
        const oldStock = existingProduct.stok_miktari;
    const oldStockStatus = existingProduct.stock_status;

    // Update product fields
    existingProduct.woo_product_id = wooProduct.id;
    existingProduct.urun_adi = wooProduct.name;
    existingProduct.stok_miktari = wooProduct.stock_quantity || 0;
        existingProduct.fiyat = parseFloat(wooProduct.price) || 0;
    existingProduct.regular_price = parseFloat(wooProduct.regular_price) || 0;
    existingProduct.sale_price = parseFloat(wooProduct.sale_price) || 0;
    existingProduct.manage_stock = wooProduct.manage_stock;
    existingProduct.stock_status = wooProduct.stock_status;
    existingProduct.categories = wooProduct.categories || [];
    existingProduct.images = wooProduct.images || [];
    existingProduct.woo_date_modified = new Date(wooProduct.date_modified);
    existingProduct.last_sync_date = new Date();
    existingProduct.sync_required = false;

    const updatedProduct = await this.productRepository.save(existingProduct);

    // Create update history
    await this.createUpdateHistory(updatedProduct, 'WooCommerce', 'sync', {
      eski_fiyat: oldPrice,
          yeni_fiyat: updatedProduct.fiyat,
          eski_stok: oldStock,
          yeni_stok: updatedProduct.stok_miktari,
          eski_stok_durumu: oldStockStatus,
          yeni_stok_durumu: updatedProduct.stock_status,
    });

    return updatedProduct;
  }

  /**
   * Check if product should be updated
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

    // Update if significant differences found
    const priceDiff = Math.abs(
      existingProduct.fiyat - parseFloat(wooProduct.price),
    );
    const stockDiff = Math.abs(
      existingProduct.stok_miktari - (wooProduct.stock_quantity || 0),
    );

    return (
      priceDiff > 0.01 ||
      stockDiff > 0 ||
      existingProduct.stock_status !== wooProduct.stock_status
    );
  }

  /**
   * Create update history record
   */
  private async createUpdateHistory(
    product: Product,
    source: string,
    updateType: string,
    details: any = {},
  ): Promise<UpdateHistory> {
    const history = new UpdateHistory();
    history.product_id = product.id;
    history.supplier_name = source as any;
    history.update_type = updateType as any;
    history.old_price = details.eski_fiyat || null;
    history.new_price = details.yeni_fiyat || null;
    history.eski_stok = details.eski_stok || null;
    history.yeni_stok = details.yeni_stok || null;
    history.eski_stok_durumu = details.eski_stok_durumu || null;
    history.yeni_stok_durumu = details.yeni_stok_durumu || null;
    history.change_details = details;
    history.is_successful = true;

    return await this.updateHistoryRepository.save(history);
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
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
