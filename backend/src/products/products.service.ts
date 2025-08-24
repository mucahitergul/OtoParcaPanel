import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, IsNull, In } from 'typeorm';
import { Product } from '../entities/product.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { UpdateHistory } from '../entities/update-history.entity';
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
    @InjectRepository(UpdateHistory)
    private updateHistoryRepository: Repository<UpdateHistory>,
  ) {}

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
      .leftJoinAndSelect('product.supplier_prices', 'supplier_prices')
      .where('product.is_active = :isActive', { isActive: true });

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
      queryBuilder.andWhere('product.fiyat >= :priceMin', {
        priceMin: filters.priceMin,
      });
    }

    if (filters.priceMax !== undefined) {
      queryBuilder.andWhere('product.fiyat <= :priceMax', {
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

    if (filters.supplier) {
      queryBuilder.andWhere('supplier_prices.supplier_name = :supplier', {
        supplier: filters.supplier,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

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
        dinamik_price: dinamikPrice?.price,
        dinamik_stock: dinamikPrice?.stock_quantity,
        dinamik_last_updated: dinamikPrice?.last_updated?.toISOString(),
        basbuğ_price: basbuğPrice?.price,
        basbuğ_stock: basbuğPrice?.stock_quantity,
        basbuğ_last_updated: basbuğPrice?.last_updated?.toISOString(),
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
      relations: ['supplier_prices', 'update_history'],
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
      relations: ['supplier_prices', 'update_history'],
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

    // Create update history
    await this.createUpdateHistory(updatedProduct, 'Manual', 'stock', {
      eski_stok: oldStock,
      yeni_stok: stockQuantity,
      eski_stok_durumu: oldStockStatus,
      yeni_stok_durumu: updatedProduct.stock_status,
    });

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
    const oldPrice = product.fiyat;

    product.fiyat = price;
    product.sync_required = true;

    const updatedProduct = await this.productRepository.save(product);

    // Create update history
    await this.createUpdateHistory(updatedProduct, 'Manual', 'price', {
      eski_fiyat: oldPrice,
      yeni_fiyat: price,
    });

    this.logger.log(
      `Updated price for product ${id} from ${oldPrice} to ${price}`,
    );
    return updatedProduct;
  }

  /**
   * Update a product
   */
  async updateProduct(
    id: number,
    updateData: {
      urun_adi: string;
      stok_kodu: string;
      fiyat: number;
      stok_miktari: number;
      stock_status: 'instock' | 'outofstock' | 'onbackorder';
      description?: string;
      short_description?: string;
      regular_price?: number;
      sale_price?: number;
    },
  ): Promise<Product> {
    const product = await this.findOne(id);
    
    const oldPrice = product.fiyat;
    const oldStock = product.stok_miktari;
    const oldStockStatus = product.stock_status;
    
    // Update product fields
    Object.assign(product, updateData);
    product.sync_required = true;
    
    const updatedProduct = await this.productRepository.save(product);
    
    // Create update history
    await this.createUpdateHistory(product, 'Manual Update', 'both', {
      eski_fiyat: oldPrice,
      yeni_fiyat: updateData.fiyat,
      eski_stok: oldStock,
      yeni_stok: updateData.stok_miktari,
      eski_stok_durumu: oldStockStatus,
      yeni_stok_durumu: updateData.stock_status,
    });
    
    this.logger.log(
      `Updated product ${id}: ${product.urun_adi} - Price: ${oldPrice} -> ${updateData.fiyat}, Stock: ${oldStock} -> ${updateData.stok_miktari}`,
    );
    
    return updatedProduct;
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
    supplierPrice.last_updated = new Date();

    const updatedSupplierPrice =
      await this.supplierPriceRepository.save(supplierPrice);

    // Create update history
    const product = await this.findOne(productId);
    await this.createUpdateHistory(product, supplier, 'both', {
      eski_fiyat: oldPrice,
      yeni_fiyat: price,
      eski_stok: supplierPrice.stock_quantity,
      yeni_stok: stockQuantity,
      eski_stok_durumu: supplierPrice.stock_status,
      yeni_stok_durumu: stockStatus,
    });

    this.logger.log(
      `Updated ${supplier} price for product ${productId}: ${oldPrice} -> ${price}`,
    );

    return updatedSupplierPrice;
  }

  /**
   * Get update history for a product
   */
  async getUpdateHistory(
    productId: number,
    limit = 50,
  ): Promise<UpdateHistory[]> {
    return await this.updateHistoryRepository.find({
      where: { product_id: productId },
      order: { guncelleme_tarihi: 'DESC' },
      take: limit,
    });
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

    const recentUpdates = await this.updateHistoryRepository.count({
      where: {
        guncelleme_tarihi: Between(oneDayAgo, new Date()),
      },
    });

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

          await this.createUpdateHistory(product, 'Bulk Operation', 'sync', {
            operation: 'bulk_sync',
          });

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
        where: { id: In(productIds), is_active: true },
      });

      for (const product of products) {
        try {
          product.is_active = false;
          await this.productRepository.save(product);

          await this.createUpdateHistory(product, 'Bulk Operation', 'delete', {
            operation: 'bulk_delete',
          });

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
          const oldPrice = product.fiyat;
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

          product.fiyat = Math.max(0, newPrice); // Ensure price is not negative
          product.sync_required = true;
          await this.productRepository.save(product);

          await this.createUpdateHistory(product, 'Bulk Operation', 'price', {
            operation: 'bulk_price_update',
            eski_fiyat: oldPrice,
      yeni_fiyat: product.fiyat,
            update_type: updateType,
            value,
          });

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

          await this.createUpdateHistory(product, 'Bulk Operation', 'stock', {
            operation: 'bulk_stock_update',
            eski_stok: oldStock,
            yeni_stok: product.stok_miktari,
            eski_stok_durumu: oldStockStatus,
            yeni_stok_durumu: product.stock_status,
            update_type: updateType,
            value,
          });

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
        if (fields && fields.includes('fiyat')) data.fiyat = product.fiyat;
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
   * Soft delete a product
   */
  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    product.is_active = false;
    await this.productRepository.save(product);
    this.logger.log(`Soft deleted product ${id}`);
  }
}
