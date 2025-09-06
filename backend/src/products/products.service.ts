import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, IsNull, In, Not } from 'typeorm';
import { Product } from '../entities/product.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';

import { WooCommerceService } from '../woocommerce/woocommerce.service';
import { SettingsService } from '../settings/settings.service';
import { ProductSyncService, SyncProgress } from './product-sync.service';
import {
  BulkSyncDto,
  BulkDeleteDto,
  BulkPriceUpdateDto,
  BulkStockUpdateDto,
  BulkExportDto,
  BulkOperationResultDto,
} from './dto/bulk-operations.dto';

export interface ProductFilter {
  search?: string;
  category?: string;
  stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
  hasStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  supplier?: 'Dinamik' | 'Başbuğ' | 'Doğuş';
  needsSync?: boolean;
}

export interface ProductListResponse {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(SupplierPrice)
    private supplierPriceRepository: Repository<SupplierPrice>,

    @Inject(forwardRef(() => WooCommerceService))
    private wooCommerceService: WooCommerceService,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => ProductSyncService))
    private productSyncService: ProductSyncService,
  ) {}
  
  /**
   * Helper method to add a small delay between operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all products with filtering and pagination
   */
  async findAll(
    page = 1,
    limit = 20,
    filters: ProductFilter = {},
  ): Promise<ProductListResponse> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.is_active = :isActive', { isActive: true });

    // Use innerJoin if supplier filter is applied, otherwise leftJoin
    if (filters.supplier) {
      queryBuilder.innerJoinAndSelect('product.supplier_prices', 'supplier_prices',
        'supplier_prices.is_active = :supplierActive AND supplier_prices.supplier_name = :supplier',
        { supplierActive: true, supplier: filters.supplier }
      );
    } else {
      queryBuilder.leftJoinAndSelect('product.supplier_prices', 'supplier_prices');
    }

    // Apply filters
    if (filters.search) {
      queryBuilder.andWhere(
        '(product.urun_adi ILIKE :search OR product.stok_kodu ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.stockStatus) {
      queryBuilder.andWhere('product.stock_status = :stockStatus', {
        stockStatus: filters.stockStatus,
      });
    }

    if (filters.hasStock !== undefined) {
      if (filters.hasStock) {
        queryBuilder.andWhere('product.stok_miktari > 0');
      } else {
        queryBuilder.andWhere('product.stok_miktari = 0');
      }
    }

    if (filters.priceMin !== undefined) {
      queryBuilder.andWhere('product.regular_price >= :priceMin', {
        priceMin: filters.priceMin,
      });
    }

    if (filters.priceMax !== undefined) {
      queryBuilder.andWhere('product.regular_price <= :priceMax', {
        priceMax: filters.priceMax,
      });
    }

    if (filters.needsSync) {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      queryBuilder.andWhere(
        '(product.sync_required = true OR product.last_sync_date IS NULL OR product.last_sync_date < :oneDayAgo)',
        { oneDayAgo },
      );
    }

    // Supplier filter is now handled in the JOIN condition above

    // Get total count with distinct to avoid duplicates from joins
    // Create a separate query builder for counting to avoid conflicts
    const countQueryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.is_active = :isActive', { isActive: true });

    // Only join supplier_prices if supplier filter is applied
    if (filters.supplier) {
      countQueryBuilder.innerJoin('product.supplier_prices', 'supplier_prices',
        'supplier_prices.is_active = :supplierActive AND supplier_prices.supplier_name = :supplier',
        { supplierActive: true, supplier: filters.supplier }
      );
    }

    // Apply the same filters for counting
    if (filters.search) {
      countQueryBuilder.andWhere(
        '(product.urun_adi ILIKE :search OR product.stok_kodu ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.stockStatus) {
      countQueryBuilder.andWhere('product.stock_status = :stockStatus', {
        stockStatus: filters.stockStatus,
      });
    }

    if (filters.hasStock !== undefined) {
      if (filters.hasStock) {
        countQueryBuilder.andWhere('product.stok_miktari > 0');
      } else {
        countQueryBuilder.andWhere('product.stok_miktari = 0');
      }
    }

    if (filters.priceMin !== undefined) {
      countQueryBuilder.andWhere('product.regular_price >= :priceMin', {
        priceMin: filters.priceMin,
      });
    }

    if (filters.priceMax !== undefined) {
      countQueryBuilder.andWhere('product.regular_price <= :priceMax', {
        priceMax: filters.priceMax,
      });
    }

    if (filters.needsSync) {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      countQueryBuilder.andWhere(
        '(product.sync_required = true OR product.last_sync_date IS NULL OR product.last_sync_date < :oneDayAgo)',
        { oneDayAgo },
      );
    }

    // Supplier filter is now handled in the JOIN condition above

    const countResult = await countQueryBuilder
      .select('COUNT(DISTINCT product.id)', 'count')
      .getRawOne();
    
    const total = parseInt(countResult.count);

    // Apply pagination
    const products = await queryBuilder
      .orderBy('product.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Transform products to include supplier prices in the format expected by frontend
    const transformedProducts = products.map(product => {
      const supplierPrices = product.supplier_prices || [];
      
      // Find prices for each supplier
      const dinamikPrice = supplierPrices.find(sp => sp.supplier_name === 'Dinamik');
      const basbuğPrice = supplierPrices.find(sp => sp.supplier_name === 'Başbuğ');
      const dogusPrice = supplierPrices.find(sp => sp.supplier_name === 'Doğuş');
      
      return {
        ...product,
        supplier_tags: product.supplier_tags,
        dinamik_price: dinamikPrice?.price,
        dinamik_stock: dinamikPrice?.stock_quantity,
        dinamik_last_updated: dinamikPrice?.last_updated?.toISOString(),
        basbug_price: basbuğPrice?.price,
        basbug_stock: basbuğPrice?.stock_quantity,
        basbug_last_updated: basbuğPrice?.last_updated?.toISOString(),
        dogus_price: dogusPrice?.price,
        dogus_stock: dogusPrice?.stock_quantity,
        dogus_last_updated: dogusPrice?.last_updated?.toISOString(),
        woo_last_update: product.last_sync_date?.toISOString(),
      };
    });

    return {
      products: transformedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single product by ID
   */
  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, is_active: true },
      relations: ['supplier_prices', 'stock_history'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Get product by SKU
   */
  async findBySku(sku: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { stok_kodu: sku, is_active: true },
      relations: ['supplier_prices', 'stock_history'],
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return product;
  }

  /**
   * Get product by WooCommerce ID
   */
  async findByWooId(wooId: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { woo_product_id: wooId, is_active: true },
      relations: ['supplier_prices', 'update_history'],
    });

    if (!product) {
      throw new NotFoundException(
        `Product with WooCommerce ID ${wooId} not found`,
      );
    }

    return product;
  }

  /**
   * Update product stock
   */
  async updateStock(id: number, stockQuantity: number): Promise<Product> {
    const product = await this.findOne(id);
    const oldStock = product.stok_miktari;
    const oldStockStatus = product.stock_status;

    product.stok_miktari = stockQuantity;
    product.stock_status = stockQuantity > 0 ? 'instock' : 'outofstock';
    product.sync_required = true;

    const updatedProduct = await this.productRepository.save(product);



    // Sync with WooCommerce if product has woo_product_id
    if (updatedProduct.woo_product_id) {
      try {
        await this.wooCommerceService.updateProductStock(
          updatedProduct.woo_product_id,
          stockQuantity,
          updatedProduct.stock_status,
        );
        this.logger.log(
          `Synced stock update to WooCommerce for product ${id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync stock to WooCommerce for product ${id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Updated stock for product ${id} from ${oldStock} to ${stockQuantity}`,
    );
    return updatedProduct;
  }

  /**
   * Update product price
   */
  async updatePrice(id: number, price: number): Promise<Product> {
    const product = await this.findOne(id);
    const oldPrice = product.regular_price;

    product.regular_price = price;
    product.sync_required = true;

    const updatedProduct = await this.productRepository.save(product);



    // Sync with WooCommerce if product has woo_product_id
    if (updatedProduct.woo_product_id) {
      try {
        await this.wooCommerceService.updateProductPrice(
          updatedProduct.woo_product_id,
          price,
        );
        this.logger.log(
          `Synced price update to WooCommerce for product ${id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync price to WooCommerce for product ${id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Updated price for product ${id} from ${oldPrice} to ${price}`,
    );
    return updatedProduct;
  }

  /**
   * Update a product with comprehensive validation and WooCommerce sync
   */
  async updateProduct(
    id: number,
    updateData: {
      urun_adi: string;
      stok_kodu: string;
      regular_price: number;
      stok_miktari: number;
      stock_status: 'instock' | 'outofstock' | 'onbackorder';
      sale_price?: number;
    },
  ): Promise<Product> {
    this.logger.log(`Starting product update for ID: ${id}`);
    
    // 1. Validate input data
    this.validateUpdateData(updateData);
    
    // 2. Get existing product
    const product = await this.findOne(id);
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    // 3. Store old values for history and comparison
    const oldValues = {
      regular_price: product.regular_price,
      stok_miktari: product.stok_miktari,
      stock_status: product.stock_status,
      urun_adi: product.urun_adi,
      stok_kodu: product.stok_kodu,
      sale_price: product.sale_price,
    };
    
    // 4. Check if any changes are needed
    const hasChanges = this.detectChanges(oldValues, updateData);
    if (!hasChanges) {
      this.logger.log(`No changes detected for product ${id}`);
      return product;
    }
    
    // 5. Update product fields
    product.urun_adi = updateData.urun_adi;
    product.stok_kodu = updateData.stok_kodu;
    product.regular_price = updateData.regular_price;
    product.stok_miktari = updateData.stok_miktari;
    product.stock_status = updateData.stock_status;
    
    if (updateData.sale_price !== undefined) {
      product.sale_price = updateData.sale_price;
    }
    
    // 5.1. Check auto sync setting
    const autoSyncEnabled = await this.settingsService.getSetting('auto_sync_enabled');
    const shouldAutoSync = autoSyncEnabled.value === true || autoSyncEnabled.value === 'true';
    
    // Mark for sync and update timestamps
    product.sync_required = !shouldAutoSync; // Only mark as requiring sync if auto sync is disabled
    product.updated_at = new Date();
    
    // 6. Save to database
    let updatedProduct: Product;
    try {
      updatedProduct = await this.productRepository.save(product);
      this.logger.log(`Product ${id} saved to database successfully`);
    } catch (error) {
      this.logger.error(`Failed to save product ${id} to database: ${error.message}`);
      throw new Error(`Database save failed: ${error.message}`);
    }
    
    // 7. Handle WooCommerce sync based on auto sync setting
    if (updatedProduct.woo_product_id) {
      if (shouldAutoSync) {
        // Auto sync is enabled - sync immediately to WooCommerce
        this.logger.log(`Auto sync enabled - syncing product ${id} immediately to WooCommerce`);
        await this.syncToWooCommerce(updatedProduct, oldValues, updateData);
      } else {
        // Auto sync is disabled - just mark as needing sync for manual sync later
        this.logger.log(`Auto sync disabled - product ${id} marked for manual sync`);
      }
    } else {
      this.logger.log(`Product ${id} has no WooCommerce ID, skipping sync`);
    }
    
    this.logger.log(
      `Product update completed for ${id}: ${updatedProduct.urun_adi} - ` +
      `Price: ${oldValues.regular_price} → ${updateData.regular_price}, ` +
      `Stock: ${oldValues.stok_miktari} → ${updateData.stok_miktari}`,
    );
    
    return updatedProduct;
  }
  
  /**
   * Validate update data
   */
  private validateUpdateData(updateData: any): void {
    if (!updateData.urun_adi || updateData.urun_adi.trim().length === 0) {
      throw new Error('Product name is required');
    }
    
    if (!updateData.stok_kodu || updateData.stok_kodu.trim().length === 0) {
      throw new Error('Stock code is required');
    }
    
    if (typeof updateData.fiyat !== 'number' || updateData.fiyat < 0) {
      throw new Error('Price must be a valid positive number');
    }
    
    if (typeof updateData.stok_miktari !== 'number' || updateData.stok_miktari < 0) {
      throw new Error('Stock quantity must be a valid positive number');
    }
    
    if (!['instock', 'outofstock', 'onbackorder'].includes(updateData.stock_status)) {
      throw new Error('Invalid stock status');
    }
    
    if (updateData.regular_price !== undefined && (typeof updateData.regular_price !== 'number' || updateData.regular_price < 0)) {
      throw new Error('Regular price must be a valid positive number');
    }
    
    if (updateData.sale_price !== undefined && (typeof updateData.sale_price !== 'number' || updateData.sale_price < 0)) {
      throw new Error('Sale price must be a valid positive number');
    }
  }
  
  /**
   * Detect if there are any changes between old and new values
   */
  private detectChanges(oldValues: any, newValues: any): boolean {
    return (
      oldValues.urun_adi !== newValues.urun_adi ||
      oldValues.stok_kodu !== newValues.stok_kodu ||
      Math.abs(oldValues.fiyat - newValues.fiyat) > 0.01 ||
      oldValues.stok_miktari !== newValues.stok_miktari ||
      oldValues.stock_status !== newValues.stock_status ||
      (newValues.regular_price !== undefined && Math.abs((oldValues.regular_price || 0) - newValues.regular_price) > 0.01) ||
      (newValues.sale_price !== undefined && Math.abs((oldValues.sale_price || 0) - newValues.sale_price) > 0.01)
    );
  }
  
  /**
   * Sync product changes to WooCommerce
   */
  private async syncToWooCommerce(product: Product, oldValues: any, newValues: any): Promise<void> {
    this.logger.log(`Starting WooCommerce sync for product ${product.id} (WooCommerce ID: ${product.woo_product_id})`);
    
    try {
      // Test WooCommerce connection first
      const isConnected = await this.wooCommerceService.testConnection();
      if (!isConnected) {
        throw new Error('WooCommerce connection test failed');
      }
      
      // Prepare update data for WooCommerce
      const wooUpdateData: any = {};
      
      // Update basic product info
      if (oldValues.urun_adi !== newValues.urun_adi) {
        wooUpdateData.name = newValues.urun_adi;
      }
      
      if (oldValues.stok_kodu !== newValues.stok_kodu) {
        wooUpdateData.sku = newValues.stok_kodu;
      }
      
      // Update pricing
      if (Math.abs((oldValues.regular_price || 0) - newValues.regular_price) > 0.01) {
        wooUpdateData.regular_price = newValues.regular_price.toString();
      }
      
      if (newValues.sale_price !== undefined) {
        if (newValues.sale_price > 0 && Math.abs((oldValues.sale_price || 0) - newValues.sale_price) > 0.01) {
          wooUpdateData.sale_price = newValues.sale_price.toString();
        } else if (newValues.sale_price === 0 && oldValues.sale_price > 0) {
          wooUpdateData.sale_price = ''; // Remove sale price
        }
      }
      
      // Update stock
      if (oldValues.stok_miktari !== newValues.stok_miktari || oldValues.stock_status !== newValues.stock_status) {
        wooUpdateData.stock_quantity = newValues.stok_miktari;
        wooUpdateData.manage_stock = true;
        wooUpdateData.stock_status = newValues.stock_status;
      }
      
      // Update supplier tags
      if (JSON.stringify(oldValues.supplier_tags || []) !== JSON.stringify(newValues.supplier_tags || [])) {
        wooUpdateData.tags = (newValues.supplier_tags || []).map(tag => ({ name: tag }));
      }
      
      // Perform the update if there are changes
      if (Object.keys(wooUpdateData).length > 0) {
        await this.performWooCommerceUpdate(product.woo_product_id, wooUpdateData);
        
        // Mark sync as completed - always set to false after successful sync
        product.sync_required = false;
        product.last_sync_date = new Date();
        await this.productRepository.save(product);
        
        this.logger.log(`Successfully synced product ${product.id} to WooCommerce with data:`, wooUpdateData);
      } else {
        // Even if no changes, mark sync as completed since we checked
        product.sync_required = false;
        product.last_sync_date = new Date();
        await this.productRepository.save(product);
        this.logger.log(`No WooCommerce sync needed for product ${product.id}`);
      }
      
    } catch (error) {
      this.logger.error(
        `WooCommerce sync failed for product ${product.id}: ${error.message}. ` +
        `Product was updated locally but sync will be retried later.`,
      );
      
      // Don't throw error - allow local update to succeed
      // The sync_required flag remains true for retry later
    }
  }
  


  /**
   * Perform the actual WooCommerce API update
   */
  private async performWooCommerceUpdate(wooProductId: number, updateData: any): Promise<void> {
    try {
      // Use the new comprehensive updateProduct method
      await this.wooCommerceService.updateProduct(wooProductId, updateData);
      
      this.logger.log(`WooCommerce API update successful for product ${wooProductId}`);
    } catch (error) {
      this.logger.error(`WooCommerce API update failed for product ${wooProductId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supplier prices for a product
   */
  async getSupplierPrices(productId: number): Promise<SupplierPrice[]> {
    return await this.supplierPriceRepository.find({
      where: { product_id: productId, is_active: true },
      order: { price: 'ASC' },
    });
  }

  /**
   * Update supplier price
   */
  async updateSupplierPrice(
    productId: number,
    supplier: 'Dinamik' | 'Başbuğ' | 'Doğuş',
    price: number,
    stockQuantity: number,
    stockStatus: 'instock' | 'outofstock' | 'onbackorder',
  ): Promise<SupplierPrice> {
    let supplierPrice = await this.supplierPriceRepository.findOne({
      where: { product_id: productId, supplier_name: supplier },
    });

    if (!supplierPrice) {
      supplierPrice = new SupplierPrice();
      supplierPrice.product_id = productId;
      supplierPrice.supplier_name = supplier;
    }

    const oldPrice = supplierPrice.price;
    supplierPrice.price = price;
    supplierPrice.stock_quantity = stockQuantity;
    supplierPrice.stock_status = stockStatus;
    supplierPrice.is_available = stockStatus !== 'outofstock';
    supplierPrice.is_active = true;
    supplierPrice.last_updated = new Date();

    const updatedSupplierPrice =
      await this.supplierPriceRepository.save(supplierPrice);

    // Automatically update supplier tags after updating supplier price
    try {
      this.logger.log(`Starting automatic supplier tags update for product ${productId}`);
      await this.updateSupplierTags(productId);
      this.logger.log(`Successfully completed supplier tags update for product ${productId}`);
    } catch (error) {
      this.logger.error(`Error updating supplier tags for product ${productId}:`, error);
    }

    // Automatically update product price based on best supplier after updating supplier price
    try {
      this.logger.log(`Starting automatic price update for product ${productId}`);
      await this.updateProductPriceFromBestSupplier(productId);
      this.logger.log(`Successfully completed price update for product ${productId}`);
    } catch (error) {
      this.logger.error(`Error updating product price for product ${productId}:`, error);
    }

    this.logger.log(
      `Updated ${supplier} price for product ${productId}: ${oldPrice} -> ${price}`,
    );

    return updatedSupplierPrice;
  }

  /**
   * Update supplier tags for a product based on available supplier prices
   */
  async updateSupplierTags(productId: number): Promise<Product> {
    const product = await this.findOne(productId);
    
    // Get all active supplier prices for this product
    const supplierPrices = await this.supplierPriceRepository.find({
      where: { 
        product_id: productId, 
        is_active: true
      },
    });

    // Extract supplier names from all active supplier prices
    // If a supplier price record exists and is active, it means the product was found at that supplier
    // even if price is 0 (product exists but no price/stock info)
    const supplierTags = supplierPrices
      .filter(sp => sp.is_active) // Include all active supplier records (product found at supplier)
      .map(sp => sp.supplier_name);
    
    // Update product with new supplier tags
    product.supplier_tags = supplierTags;
    product.sync_required = true; // Mark for WooCommerce sync
    
    const updatedProduct = await this.productRepository.save(product);
    
    this.logger.log(
      `Updated supplier tags for product ${productId}: [${supplierTags.join(', ')}]`,
    );
    
    // Sync tags to WooCommerce if product has woo_product_id
    if (updatedProduct.woo_product_id) {
      try {
        await this.wooCommerceService.updateProductTags(
          updatedProduct.woo_product_id,
          supplierTags,
        );
        this.logger.log(
          `Synced supplier tags to WooCommerce for product ${productId}`,
        );
        
        // Mark sync as completed
        product.sync_required = false;
        product.last_sync_date = new Date();
        await this.productRepository.save(product);
      } catch (error) {
        this.logger.error(
          `Failed to sync tags to WooCommerce for product ${productId}: ${error.message}`,
        );
        // Keep sync_required as true for retry
      }
    }
    
    return updatedProduct;
  }

  /**
   * Bulk update supplier tags for multiple products
   */
  async bulkUpdateSupplierTags(productIds?: number[]): Promise<{
    success: boolean;
    updatedCount: number;
    errorCount: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      updatedCount: 0,
      errorCount: 0,
      errors: [] as string[],
    };

    try {
      let products: Product[];
      
      if (productIds && productIds.length > 0) {
        products = await this.productRepository.find({
          where: { id: In(productIds), is_active: true },
        });
      } else {
        products = await this.productRepository.find({
          where: { is_active: true },
        });
      }

      this.logger.log(`Starting bulk supplier tags update for ${products.length} products`);

      for (const product of products) {
        try {
          await this.updateSupplierTags(product.id);
          result.updatedCount++;
        } catch (error) {
          result.errorCount++;
          const errorMessage = `Product ${product.id}: ${error.message}`;
          result.errors.push(errorMessage);
          this.logger.error(`Failed to update supplier tags for product ${product.id}:`, error);
        }
      }

      result.success = result.errorCount === 0;
      
      this.logger.log(
        `Bulk supplier tags update completed: ${result.updatedCount} updated, ${result.errorCount} errors`,
      );

      return result;
    } catch (error) {
      this.logger.error('Bulk supplier tags update failed:', error);
      throw error;
    }
  }

  /**
   * Sync single product to WooCommerce
   */
  async syncSingleProductToWooCommerce(product: Product): Promise<void> {
    this.logger.log(`Starting WooCommerce sync for product ${product.id} (WooCommerce ID: ${product.woo_product_id})`);
    
    try {
      // Test WooCommerce connection first
      const isConnected = await this.wooCommerceService.testConnection();
      if (!isConnected) {
        throw new Error('WooCommerce connection test failed');
      }
      
      // Prepare update data for WooCommerce
      const wooUpdateData: any = {
        name: product.urun_adi,
        sku: product.stok_kodu,
        regular_price: product.regular_price.toString(),
        stock_quantity: product.stok_miktari,
        manage_stock: true,
        stock_status: product.stock_status,
        tags: (product.supplier_tags || []).map(tag => ({ name: tag })),
      };
      
      if (product.sale_price && product.sale_price > 0) {
        wooUpdateData.sale_price = product.sale_price.toString();
      }
      
      // Perform the update
      await this.performWooCommerceUpdate(product.woo_product_id, wooUpdateData);
      
      // Mark sync as completed only if successful
      product.sync_required = false;
      product.last_sync_date = new Date();
      await this.productRepository.save(product);
      
      this.logger.log(`Successfully synced product ${product.id} to WooCommerce`);
      
    } catch (error) {
      this.logger.error(
        `WooCommerce sync failed for product ${product.id}: ${error.message}`
      );
      // Don't change sync_required flag on failure - keep it true for retry
      throw error;
    }
  }

  /**
   * Get products statistics
   */
  async getStatistics() {
    const totalProducts = await this.productRepository.count({
      where: { is_active: true },
    });

    const inStockProducts = await this.productRepository.count({
      where: { is_active: true, stock_status: 'instock' },
    });

    const outOfStockProducts = await this.productRepository.count({
      where: { is_active: true, stock_status: 'outofstock' },
    });

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const needsSyncProducts = await this.productRepository.count({
      where: [
        { is_active: true, sync_required: true },
        { is_active: true, last_sync_date: IsNull() },
        { is_active: true, last_sync_date: Between(new Date(0), oneDayAgo) },
      ],
    });

    const recentUpdates = 0; // UpdateHistory removed

    return {
      totalProducts,
      inStockProducts,
      outOfStockProducts,
      needsSyncProducts,
      recentUpdates,
      stockPercentage:
        totalProducts > 0 ? (inStockProducts / totalProducts) * 100 : 0,
    };
  }



  /**
   * Bulk sync products
   */
  async bulkSync(bulkSyncDto: BulkSyncDto): Promise<BulkOperationResultDto> {
    const { productIds } = bulkSyncDto;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const products = await this.productRepository.find({
        where: { id: In(productIds), is_active: true },
      });

      for (const product of products) {
        try {
          product.sync_required = true;
          product.last_sync_date = new Date();
          await this.productRepository.save(product);



          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Product ${product.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `Bulk sync completed: ${results.success} success, ${results.failed} failed`,
      );

      return {
        success: true,
        message: `Bulk sync completed: ${results.success} products synced successfully`,
        data: results,
      };
    } catch (error) {
      this.logger.error('Bulk sync failed:', error);
      throw error;
    }
  }

  /**
   * Bulk delete products
   */
  async bulkDelete(
    bulkDeleteDto: BulkDeleteDto,
  ): Promise<BulkOperationResultDto> {
    const { productIds } = bulkDeleteDto;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const products = await this.productRepository.find({
        where: { id: In(productIds) },
      });

      for (const product of products) {
        try {
          await this.productRepository.remove(product);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Product ${product.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `Bulk delete completed: ${results.success} success, ${results.failed} failed`,
      );

      return {
        success: true,
        message: `Bulk delete completed: ${results.success} products deleted successfully`,
        data: results,
      };
    } catch (error) {
      this.logger.error('Bulk delete failed:', error);
      throw error;
    }
  }

  /**
   * Bulk update product prices
   */
  async bulkPriceUpdate(
    bulkPriceUpdateDto: BulkPriceUpdateDto,
  ): Promise<BulkOperationResultDto> {
    const { productIds, updateType, value } = bulkPriceUpdateDto;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const products = await this.productRepository.find({
        where: { id: In(productIds), is_active: true },
      });

      for (const product of products) {
        try {
          const oldPrice = product.regular_price;
          let newPrice: number;

          switch (updateType) {
            case 'fixed':
              newPrice = value;
              break;
            case 'percentage_increase':
              newPrice = oldPrice * (1 + value / 100);
              break;
            case 'percentage_decrease':
              newPrice = oldPrice * (1 - value / 100);
              break;
            case 'amount_increase':
              newPrice = oldPrice + value;
              break;
            case 'amount_decrease':
              newPrice = oldPrice - value;
              break;
            default:
              throw new Error('Invalid update type');
          }

          product.regular_price = Math.max(0, newPrice); // Ensure price is not negative
          product.sync_required = true;
          await this.productRepository.save(product);



          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Product ${product.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `Bulk price update completed: ${results.success} success, ${results.failed} failed`,
      );

      return {
        success: true,
        message: `Bulk price update completed: ${results.success} products updated successfully`,
        data: results,
      };
    } catch (error) {
      this.logger.error('Bulk price update failed:', error);
      throw error;
    }
  }

  /**
   * Bulk update product stock
   */
  async bulkStockUpdate(
    bulkStockUpdateDto: BulkStockUpdateDto,
  ): Promise<BulkOperationResultDto> {
    const { productIds, updateType, value } = bulkStockUpdateDto;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const products = await this.productRepository.find({
        where: { id: In(productIds), is_active: true },
      });

      for (const product of products) {
        try {
          const oldStock = product.stok_miktari;
          const oldStockStatus = product.stock_status;
          let newStock: number;

          switch (updateType) {
            case 'fixed':
              newStock = value;
              break;
            case 'increase':
              newStock = oldStock + value;
              break;
            case 'decrease':
              newStock = oldStock - value;
              break;
            default:
              throw new Error('Invalid update type');
          }

          product.stok_miktari = Math.max(0, newStock); // Ensure stock is not negative
    product.stock_status =
      product.stok_miktari > 0 ? 'instock' : 'outofstock';
          product.sync_required = true;
          await this.productRepository.save(product);



          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Product ${product.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `Bulk stock update completed: ${results.success} success, ${results.failed} failed`,
      );

      return {
        success: true,
        message: `Bulk stock update completed: ${results.success} products updated successfully`,
        data: results,
      };
    } catch (error) {
      this.logger.error('Bulk stock update failed:', error);
      throw error;
    }
  }

  /**
   * Bulk export products
   */
  async bulkExport(
    bulkExportDto: BulkExportDto,
  ): Promise<BulkOperationResultDto> {
    const { productIds, format, fields } = bulkExportDto;

    try {
      const products = await this.productRepository.find({
        where: { id: In(productIds), is_active: true },
        relations: ['supplier_prices'],
      });

      // Filter products based on selected fields
      const exportData = products.map((product) => {
        const data: any = {};

        if (fields && fields.includes('stok_kodu'))
          data.stok_kodu = product.stok_kodu;
        if (fields && fields.includes('urun_adi'))
          data.urun_adi = product.urun_adi;
        if (fields && fields.includes('regular_price')) data.regular_price = product.regular_price;
    if (fields && fields.includes('stok_miktari'))
      data.stok_miktari = product.stok_miktari;
        if (fields && fields.includes('stock_status'))
          data.stock_status = product.stock_status;
        if (fields && fields.includes('kategori'))
          data.kategori = product.kategori;
        if (fields && fields.includes('aciklama'))
          data.aciklama = product.aciklama;
        if (fields && fields.includes('created_at'))
          data.created_at = product.created_at;
        if (fields && fields.includes('updated_at'))
          data.updated_at = product.updated_at;

        return data;
      });

      this.logger.log(
        `Bulk export completed: ${products.length} products exported in ${format} format`,
      );

      return {
        success: true,
        message: `Export completed: ${products.length} products exported successfully`,
        data: {
          format,
          count: products.length,
          exportData,
        },
      };
    } catch (error) {
      this.logger.error('Bulk export failed:', error);
      throw error;
    }
  }

  /**
   * Hard delete a product
   */
  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    this.logger.log(`Hard deleted product ${id}`);
  }

  /**
   * Delete all products with progress tracking
   */
  async deleteAllProducts(): Promise<{
    success: boolean;
    totalDeleted: number;
    message: string;
  }> {
    try {
      this.logger.log('🗑️ Starting to delete all products...');
      
      // Get total count first
      const totalCount = await this.productRepository.count();
      
      if (totalCount === 0) {
        return {
          success: true,
          totalDeleted: 0,
          message: 'No products found to delete',
        };
      }
      
      this.logger.log(`📊 Found ${totalCount} products to delete`);
      
      // Delete in batches to avoid memory issues
      const batchSize = 100;
      let totalDeleted = 0;
      
      while (true) {
        // Get a batch of products
        const products = await this.productRepository.find({
          take: batchSize,
        });
        
        if (products.length === 0) {
          break;
        }
        
        // Delete the batch
        await this.productRepository.remove(products);
        totalDeleted += products.length;
        
        this.logger.log(`🗑️ Deleted batch: ${products.length} products (Total: ${totalDeleted}/${totalCount})`);
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.logger.log(`✅ Successfully deleted all ${totalDeleted} products`);
      
      return {
        success: true,
        totalDeleted,
        message: `Successfully deleted ${totalDeleted} products`,
      };
    } catch (error) {
      this.logger.error('❌ Failed to delete all products:', error.message);
      throw new Error(`Failed to delete all products: ${error.message}`);
    }
  }





  /**
   * Push local prices to WooCommerce
   */
  async pushPricesToWooCommerce(options: {
    productIds?: number[];
    batchSize?: number;
  } = {}): Promise<{
    success: boolean;
    updatedCount: number;
    errorCount: number;
    errors: string[];
    totalProducts: number;
    processedProducts: number;
  }> {
    const { productIds, batchSize = 50 } = options;
    const startTime = Date.now();
    
    const result = {
      success: false,
      updatedCount: 0,
      errorCount: 0,
      errors: [] as string[],
      totalProducts: 0,
      processedProducts: 0,
    };

    try {
      this.logger.log('🚀 Starting push to WooCommerce...');

      // Test WooCommerce connection first
      const isConnected = await this.wooCommerceService.testConnection();
      if (!isConnected) {
        const errorMsg = 'WooCommerce connection test failed. Please check your WooCommerce settings.';
        this.logger.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      this.logger.log('✅ WooCommerce connection test successful');

      let products: Product[];

      if (productIds && productIds.length > 0) {
        // Push specific products
        this.logger.log(`🔍 Fetching ${productIds.length} specific products...`);
        products = await this.productRepository.findByIds(productIds);
        products = products.filter(p => p.woo_product_id); // Only products with WooCommerce ID
        this.logger.log(`📦 Found ${products.length} products with WooCommerce IDs out of ${productIds.length} requested`);
      } else {
        // Push all products that have WooCommerce ID
        this.logger.log(`🔍 Fetching products with WooCommerce IDs (limit: ${batchSize})...`);
        products = await this.productRepository.find({
          where: { woo_product_id: Not(IsNull()) },
          take: batchSize,
        });
        this.logger.log(`📦 Found ${products.length} products to sync`);
      }

      result.totalProducts = products.length;

      if (products.length === 0) {
        const warningMsg = 'No products found with WooCommerce IDs to sync';
        this.logger.warn(`⚠️ ${warningMsg}`);
        result.success = true; // Not an error, just nothing to do
        return result;
      }

      this.logger.log(`🔄 Starting to process ${products.length} products...`);

      // Process products one by one with detailed logging
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const progress = `${i + 1}/${products.length}`;
        
        try {
          this.logger.log(`📝 [${progress}] Processing product ${product.id} (${product.urun_adi}) - WooCommerce ID: ${product.woo_product_id}`);
          
          // Validate product data
          if (!product.woo_product_id) {
            throw new Error('Product has no WooCommerce ID');
          }
          
          if (!product.urun_adi || product.urun_adi.trim() === '') {
            throw new Error('Product name is empty');
          }
          
          if (!product.stok_kodu || product.stok_kodu.trim() === '') {
            throw new Error('Product SKU is empty');
          }

          // Prepare update data for WooCommerce
          const wooUpdateData: any = {
            name: product.urun_adi.trim(),
            sku: product.stok_kodu.trim(),
            stock_quantity: Math.max(0, Math.floor(parseFloat(product.stok_miktari?.toString() || '0'))),
            manage_stock: true,
            stock_status: product.stock_status || 'instock',
          };

          // Set pricing
          if (product.regular_price && product.regular_price > 0) {
            wooUpdateData.regular_price = product.regular_price.toString();
          } else {
            this.logger.warn(`⚠️ [${progress}] Product ${product.id} has no valid price, skipping price update`);
          }

          // Set sale price if available
          if (product.sale_price && product.sale_price > 0) {
            wooUpdateData.sale_price = product.sale_price.toString();
          } else {
            wooUpdateData.sale_price = ''; // Remove sale price
          }

          this.logger.log(`📤 [${progress}] Updating WooCommerce product ${product.woo_product_id} with data:`, {
            name: wooUpdateData.name,
            sku: wooUpdateData.sku,
            regular_price: wooUpdateData.regular_price,
            sale_price: wooUpdateData.sale_price,
            stock_quantity: wooUpdateData.stock_quantity,
            stock_status: wooUpdateData.stock_status
          });

          // Update WooCommerce product
          await this.performWooCommerceUpdate(product.woo_product_id, wooUpdateData);

          // Mark as synced only if successful
          product.sync_required = false;
          product.last_sync_date = new Date();
          await this.productRepository.save(product);

          result.updatedCount++;
          result.processedProducts++;
          this.logger.log(`✅ [${progress}] Successfully pushed product ${product.id} (${product.urun_adi}) to WooCommerce`);

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          result.errorCount++;
          result.processedProducts++;
          const detailedError = `Product ${product.id} (${product.urun_adi || 'Unknown'}): ${error.message}`;
          result.errors.push(detailedError);
          this.logger.error(`❌ [${progress}] Failed to push product ${product.id} to WooCommerce:`, {
            productId: product.id,
            productName: product.urun_adi,
            wooProductId: product.woo_product_id,
            error: error.message,
            stack: error.stack
          });
          // Don't change sync_required flag on failure - keep it true for retry
        }
      }

      result.success = result.errorCount === 0;
      const duration = Date.now() - startTime;

      // Final summary log
      if (result.success) {
        this.logger.log(
          `🎉 Push to WooCommerce completed successfully: ${result.updatedCount} products updated in ${duration}ms`
        );
      } else {
        this.logger.error(
          `⚠️ Push to WooCommerce completed with errors: ${result.updatedCount} updated, ${result.errorCount} failed in ${duration}ms`
        );
        this.logger.error('❌ Error details:', result.errors);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('💥 Push to WooCommerce failed completely:', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });
      result.errors.push(`System error: ${error.message}`);
      return result;
    }
  }

  /**
   * Update product price based on best supplier with supplier-specific profit margin
   */
  private async updateProductPriceFromBestSupplier(productId: number) {
    try {
      // Get all supplier prices for this product
      const supplierPrices = await this.supplierPriceRepository.find({
        where: {
          product_id: productId,
          is_active: true,
          is_available: true,
          stock_status: 'instock',
        },
        order: { price: 'ASC' },
      });

      if (supplierPrices.length === 0) {
        this.logger.warn(`No available suppliers found for product ${productId}`);
        return;
      }

      // Find the supplier with the lowest price
      const bestSupplier = supplierPrices[0];
      
      // Get supplier-specific profit margin
      const profitMargin = await this.settingsService.getSupplierProfitMargin(
        bestSupplier.supplier_name,
      );

      // Calculate new price with supplier-specific margin
      const newPrice = bestSupplier.price * (1 + profitMargin / 100);

      // Get current product
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        this.logger.error(`Product ${productId} not found`);
        return;
      }

      const oldPrice = product.regular_price;

      // Update product with new price and best supplier info
      await this.productRepository.update(productId, {
        regular_price: newPrice,
        best_supplier: bestSupplier.supplier_name,
        calculated_price: newPrice,
        stok_miktari: bestSupplier.stock_quantity,
        stock_status: bestSupplier.stock_status,
        sync_required: true, // Mark for WooCommerce sync
        updated_at: new Date(),
      });

      this.logger.log(
        `Auto-updated product ${productId} price: ₺${oldPrice && typeof oldPrice === 'number' ? oldPrice.toFixed(2) : '0.00'} → ₺${newPrice.toFixed(2)} ` +
        `(${bestSupplier.supplier_name} + ${profitMargin}% margin)`,
      );

    } catch (error) {
      this.logger.error(
        `Failed to update product ${productId} price from best supplier:`,
        error,
      );
    }
  }
}
