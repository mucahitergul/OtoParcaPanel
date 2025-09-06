import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { Settings } from '../entities/settings.entity';
import { SettingsService } from '../settings/settings.service';
import { WooCommerceService } from '../woocommerce/woocommerce.service';

export interface SupplierPriceUpdateDto {
  productIds: number[];
  suppliers?: ('Dinamik' | 'Başbuğ' | 'Doğuş')[];
}

export interface BestSupplierSelectionDto {
  productId: number;
}

export interface BulkBestSupplierSelectionDto {
  productIds: number[];
}

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(SupplierPrice)
    private supplierPriceRepository: Repository<SupplierPrice>,
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @Inject(forwardRef(() => SettingsService))
    private settingsService: SettingsService,
    @Inject(forwardRef(() => WooCommerceService))
    private wooCommerceService: WooCommerceService,
  ) {}

  /**
   * Get supplier prices for a specific product
   */
  async getSupplierPrices(productId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['supplier_prices'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const supplierPrices = await this.supplierPriceRepository.find({
      where: { product_id: productId, is_active: true },
      order: { price: 'ASC' },
    });

    // Get profit margin from settings
    const profitMarginSetting = await this.settingsRepository.findOne({
      where: { key: 'default_profit_margin' },
    });
    const profitMargin = profitMarginSetting
      ? parseFloat(profitMarginSetting.value)
      : 15;

    // Find best supplier (lowest price with stock)
    const bestSupplier = supplierPrices
      .filter((sp) => sp.stock_status === 'instock' && sp.is_available)
      .sort((a, b) => a.price - b.price)[0];

    return {
      product_id: productId,
      suppliers: supplierPrices.map((sp) => ({
        name: sp.supplier_name,
        price: sp.price,
        stock_quantity: sp.stock_quantity,
        stock_status: sp.stock_status,
        is_available: sp.is_available,
        last_updated: sp.last_updated,
      })),
      best_supplier: bestSupplier
        ? {
            name: bestSupplier.supplier_name,
            price: bestSupplier.price,
            calculated_price: bestSupplier.price * (1 + profitMargin / 100),
            profit_margin: profitMargin,
          }
        : null,
    };
  }

  /**
   * Save scraper data to database
   */
  async saveScraperData(scraperData: {
    productId: number;
    stockCode: string;
    supplier: string;
    price: number;
    stock: number;
    isAvailable: boolean;
    foundAtSupplier?: boolean;
  }) {
    const { productId, stockCode, supplier, price, stock, isAvailable, foundAtSupplier = true } = scraperData;

    try {
      // Verify product exists
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Map supplier names from frontend format to database format
      const supplierNameMap: { [key: string]: 'Dinamik' | 'Başbuğ' | 'Doğuş' } = {
        'dinamik': 'Dinamik',
        'basbug': 'Başbuğ',
        'dogus': 'Doğuş'
      };

      const supplierName = supplierNameMap[supplier.toLowerCase()];
      if (!supplierName) {
        throw new Error(`Unknown supplier: ${supplier}`);
      }

      // Check if product is found at this supplier (even if price/stock is 0)
      // Only update if product is explicitly found (foundAtSupplier=true or undefined)
      if (foundAtSupplier === true || foundAtSupplier === undefined) {
        // Case 1: Product found at supplier - update price, stock and add supplier tag (even if price/stock is 0)
        const stockStatus = stock > 0 ? 'instock' : 'outofstock';

        // Find existing supplier price record or create new one
        let supplierPrice = await this.supplierPriceRepository.findOne({
          where: { product_id: productId, supplier_name: supplierName },
        });

        if (supplierPrice) {
          // Update existing record
          supplierPrice.price = price;
          supplierPrice.stock_quantity = stock;
          supplierPrice.stock_status = stockStatus;
          supplierPrice.is_available = isAvailable;
          supplierPrice.last_updated = new Date();
          supplierPrice.is_active = true;
          await this.supplierPriceRepository.save(supplierPrice);
        } else {
          // Create new record
          supplierPrice = this.supplierPriceRepository.create({
            product_id: productId,
            supplier_name: supplierName,
            price: price,
            stock_quantity: stock,
            stock_status: stockStatus,
            is_available: isAvailable,
            last_updated: new Date(),
            is_active: true,
          });
          await this.supplierPriceRepository.save(supplierPrice);
        }

        this.logger.log(
          `Product found at ${supplier} - ${stockCode} (ID: ${productId}): ₺${price.toFixed(2)}, stock: ${stock}`,
        );

        // After saving scraper data, automatically update product price based on best supplier
        try {
          this.logger.log(`Starting automatic price update for product ${productId}`);
          await this.updateProductPriceFromBestSupplier(productId);
        } catch (error) {
          this.logger.error(`Error updating product price for product ${productId}:`, error);
        }

        // Update product price based on best supplier with profit margin
        try {
          this.logger.log(`Starting automatic price update for product ${productId}`);
          await this.updateProductPriceFromBestSupplier(productId);
          this.logger.log(`Successfully completed price update for product ${productId}`);
        } catch (error) {
          this.logger.error(`Error updating product price for product ${productId}:`, error);
        }

        // Automatically update supplier tags after saving scraper data
        try {
          this.logger.log(`Starting automatic supplier tags update for product ${productId}`);
          await this.updateProductSupplierTags(productId);
          this.logger.log(`Successfully completed supplier tags update for product ${productId}`);
        } catch (error) {
          this.logger.error(`Error updating supplier tags for product ${productId}:`, error);
        }

        return {
          productId,
          stockCode,
          supplier,
          price,
          stock,
          stockStatus,
          isAvailable,
          foundAtSupplier: true,
          savedAt: new Date().toISOString(),
        };
      } else {
        // Case 2: Product not found at supplier - do not add supplier tag
        this.logger.log(
          `Product NOT found at ${supplier} - ${stockCode} (ID: ${productId}) - Bu Tedarikçide Yok`,
        );

        // Remove supplier price record if it exists (product no longer available at this supplier)
        const existingSupplierPrice = await this.supplierPriceRepository.findOne({
          where: { product_id: productId, supplier_name: supplierName },
        });

        if (existingSupplierPrice) {
          await this.supplierPriceRepository.remove(existingSupplierPrice);
          this.logger.log(`Removed ${supplier} price record for product ${stockCode} as it's no longer available`);
        }

        // Do not update supplier tags when product is not found - keep existing tags
        this.logger.log(`Keeping existing supplier tags for product ${productId} - not removing tags when product not found at supplier`);

        return {
          productId,
          stockCode,
          supplier,
          price: 0,
          stock: 0,
          stockStatus: 'outofstock',
          isAvailable: false,
          foundAtSupplier: false,
          message: 'Bu Tedarikçide Yok',
          savedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to save scraper data for ${supplier} - product ${stockCode}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update single product price from specific supplier (calls Python scraper API)
   */
  async updateSinglePrice(updateDto: { product_id: number; supplier: string; stok_kodu: string }) {
    const { product_id, supplier, stok_kodu } = updateDto;

    try {
      // Verify product exists
      const product = await this.productRepository.findOne({
        where: { id: product_id },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${product_id} not found`);
      }

      // TODO: Call Python scraper API here
      // For now, simulate API call with mock data
      const mockPrice = Math.random() * 100 + 50; // Random price between 50-150
      const mockStock = Math.floor(Math.random() * 100); // Random stock 0-100
      const mockStockStatus = mockStock > 0 ? 'instock' : 'outofstock';

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update supplier price in database
      await this.supplierPriceRepository.upsert(
        {
          product_id: product_id,
          supplier_name: supplier as 'Dinamik' | 'Başbuğ' | 'Doğuş',
          price: mockPrice,
          stock_quantity: mockStock,
          stock_status: mockStockStatus,
          is_available: mockStock > 0,
          last_updated: new Date(),
          is_active: true,
        },
        ['product_id', 'supplier_name'],
      );

      this.logger.log(
        `Updated ${supplier} price for product ${stok_kodu} (ID: ${product_id}): ₺${mockPrice.toFixed(2)}`,
      );

      return {
        product_id,
        stok_kodu,
        supplier,
        price: mockPrice,
        stock: mockStock,
        stock_status: mockStockStatus,
        is_available: mockStock > 0,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to update ${supplier} price for product ${stok_kodu}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update supplier prices (mock implementation - will be replaced with Python scraper API)
   */
  async updateSupplierPrices(updateDto: SupplierPriceUpdateDto) {
    const { productIds, suppliers = ['Dinamik', 'Başbuğ', 'Doğuş'] } =
      updateDto;

    const results = {
      updated_products: 0,
      failed_products: 0,
      processing_time: '0 seconds',
      details: [] as any[],
    };

    const startTime = Date.now();

    for (const productId of productIds) {
      try {
        const product = await this.productRepository.findOne({
          where: { id: productId },
        });

        if (!product) {
          results.failed_products++;
          results.details.push({
            product_id: productId,
            status: 'failed',
            error: 'Product not found',
          });
          continue;
        }

        const updatedSuppliers: number[] = [];

        for (const supplierName of suppliers) {
          // Mock price data - in real implementation, this would call Python scraper API
          const mockPrice = Math.random() * 100 + 50; // Random price between 50-150
          const mockStock = Math.floor(Math.random() * 100); // Random stock 0-100
          const mockStockStatus = mockStock > 0 ? 'instock' : 'outofstock';

          await this.supplierPriceRepository.upsert(
            {
              product_id: productId,
              supplier_name: supplierName,
              price: mockPrice,
              stock_quantity: mockStock,
              stock_status: mockStockStatus,
              is_available: mockStock > 0,
              last_updated: new Date(),
              is_active: true,
            },
            ['product_id', 'supplier_name'],
          );

          updatedSuppliers.push(productId);
        }

        // Automatically update supplier tags after updating supplier prices
        try {
          this.logger.log(`Starting automatic supplier tags update for product ${productId}`);
          await this.updateProductSupplierTags(productId);
        } catch (error) {
          this.logger.error(`Error updating supplier tags for product ${productId}:`, error);
        }

        results.updated_products++;
        results.details.push({
          product_id: productId,
          status: 'success',
          updated_suppliers: updatedSuppliers,
        });
      } catch (error) {
        this.logger.error(
          `Failed to update supplier prices for product ${productId}:`,
          error,
        );
        results.failed_products++;
        results.details.push({
          product_id: productId,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const endTime = Date.now();
    results.processing_time = `${Math.round((endTime - startTime) / 1000)} seconds`;

    return results;
  }

  /**
   * Update supplier tags for a product based on available supplier prices
   */
  private async updateProductSupplierTags(productId: number): Promise<void> {
    try {
      this.logger.log(`updateProductSupplierTags called for product ${productId}`);
      
      // Get the product
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      this.logger.log(`Found product ${productId}: ${product.urun_adi}`);

      // Get all active supplier prices for this product that have price and stock data
      const supplierPrices = await this.supplierPriceRepository.find({
        where: { 
          product_id: productId, 
          is_active: true
        },
      });
      
      this.logger.log(`Found ${supplierPrices.length} active supplier prices for product ${productId}`);
      supplierPrices.forEach(sp => {
        this.logger.log(`  - ${sp.supplier_name}: ₺${sp.price}, stock: ${sp.stock_quantity}, available: ${sp.is_available}`);
      });

      // Extract supplier names from all active supplier prices
      // If a supplier price record exists and is active, it means the product was found at that supplier
      // even if price is 0 (product exists but no price/stock info)
      const activeSupplierTags = supplierPrices
        .filter(sp => sp.is_active) // Include all active supplier records (product found at supplier)
        .map(sp => sp.supplier_name);
      
      this.logger.log(`Suppliers with data: [${activeSupplierTags.join(', ')}]`);
      
      // Use only active supplier tags (don't merge with existing to avoid stale tags)
      const allTags = [...new Set(activeSupplierTags)];
      
      this.logger.log(`Previous supplier tags: [${(product.supplier_tags || []).join(', ') || 'none'}]`);
      this.logger.log(`Active supplier tags: [${activeSupplierTags.join(', ')}]`);
      this.logger.log(`New supplier tags: [${allTags.join(', ')}]`);
      this.logger.log(`DEBUG - Product ${productId} (${product.stok_kodu}) supplier tags update:`);
      this.logger.log(`  - Before: ${JSON.stringify(product.supplier_tags || [])}`);
      this.logger.log(`  - After: ${JSON.stringify(allTags)}`);
      
      // Update product with merged supplier tags
      product.supplier_tags = allTags;
      product.sync_required = true; // Mark for WooCommerce sync
      
      const updatedProduct = await this.productRepository.save(product);
      
      this.logger.log(
        `Updated supplier tags for product ${productId}: [${allTags.join(', ')}]`,
      );
      
      // WooCommerce sync disabled for scraper operations
      // if (updatedProduct.woo_product_id) {
      //   try {
      //     await this.wooCommerceService.updateProductTags(
      //       updatedProduct.woo_product_id,
      //       allTags,
      //     );
      //     this.logger.log(
      //       `Synced supplier tags to WooCommerce for product ${productId}`,
      //     );
      //   } catch (wooError) {
      //     this.logger.error(
      //       `Failed to sync supplier tags to WooCommerce for product ${productId}:`,
      //       wooError,
      //     );
      //     // Don't throw error here, just log it - the database update was successful
      //   }
      // }
    } catch (error) {
      this.logger.error(`Failed to update supplier tags for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Select best supplier for a product and update calculated price
   */
  async selectBestSupplier(selectionDto: BestSupplierSelectionDto) {
    const { productId } = selectionDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['supplier_prices'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Find best supplier
    const bestSupplierPrice = await this.supplierPriceRepository.findOne({
      where: {
        product_id: productId,
        stock_status: 'instock',
        is_available: true,
        is_active: true,
      },
      order: { price: 'ASC' },
    });

    if (!bestSupplierPrice) {
      throw new NotFoundException(
        `No available supplier found for product ${productId}`,
      );
    }

    // Get supplier-specific profit margin
    const profitMargin = await this.settingsService.getSupplierProfitMargin(
      bestSupplierPrice.supplier_name,
    );

    // Calculate new price
    const oldPrice = product.regular_price;
    const newCalculatedPrice =
      bestSupplierPrice.price * (1 + profitMargin / 100);

    // Update product
    await this.productRepository.update(productId, {
      best_supplier: bestSupplierPrice.supplier_name,
      calculated_price: newCalculatedPrice,
      regular_price: newCalculatedPrice,
      stok_miktari: bestSupplierPrice.stock_quantity,
      stock_status: bestSupplierPrice.stock_status,
      sync_required: true,
    });



    this.logger.log(
      `Selected best supplier ${bestSupplierPrice.supplier_name} for product ${productId}`,
    );

    return {
      success: true,
      data: {
        product_id: productId,
        selected_supplier: bestSupplierPrice.supplier_name,
        supplier_price: bestSupplierPrice.price,
        calculated_price: newCalculatedPrice,
        profit_margin: profitMargin,
        old_price: oldPrice,
      },
    };
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

      // TODO: Trigger WooCommerce sync for this product
       // This could be done by calling WooCommerce service or adding to sync queue
       
     } catch (error) {
       this.logger.error(
         `Failed to update product ${productId} price from best supplier:`,
         error,
       );
     }
   }

  async selectBestSuppliersBulk(
    bulkSelectionDto: BulkBestSupplierSelectionDto,
  ) {
    const { productIds } = bulkSelectionDto;

    const results = {
      updated_products: 0,
      failed_products: 0,
      processing_time: '0 seconds',
      details: [] as any[],
    };

    const startTime = Date.now();

    for (const productId of productIds) {
      try {
        const result = await this.selectBestSupplier({ productId });
        results.updated_products++;
         results.details.push({
           status: 'success',
           ...result.data,
         });
      } catch (error) {
        this.logger.error(
          `Failed to select best supplier for product ${productId}:`,
          error,
        );
        results.failed_products++;
        results.details.push({
          product_id: productId,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const endTime = Date.now();
    results.processing_time = `${Math.round((endTime - startTime) / 1000)} seconds`;

    return results;
  }

  /**
   * Get all suppliers
   */
  async getAllSuppliers() {
    return [
      { name: 'Dinamik', status: 'active' },
      { name: 'Başbuğ', status: 'active' },
      { name: 'Doğuş', status: 'active' },
    ];
  }

  /**
   * Remove supplier data for a specific product
   * This removes supplier price record and updates supplier tags
   */
  async removeSupplierData(productId: number, supplier: string) {
    try {
      // Find the product
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Map supplier names to database field names
      const supplierNameMap = {
        'basbug': 'Başbuğ',
        'dinamik': 'Dinamik',
        'dogus': 'Doğuş',
        'Başbuğ': 'Başbuğ',
        'Dinamik': 'Dinamik',
        'Doğuş': 'Doğuş',
      };

      const supplierName = supplierNameMap[supplier] || supplier;

      // Remove supplier price record
      const supplierPrice = await this.supplierPriceRepository.findOne({
        where: { product_id: productId, supplier_name: supplierName },
      });

      if (supplierPrice) {
        await this.supplierPriceRepository.remove(supplierPrice);
        this.logger.log(`Removed ${supplierName} price record for product ${product.stok_kodu}`);
      }

      // Update supplier tags - remove the supplier from tags
      await this.updateProductSupplierTags(productId);

      // Update product price based on remaining best supplier
      try {
        await this.updateProductPriceFromBestSupplier(productId);
        this.logger.log(`Updated product price after removing ${supplierName} data for product ${productId}`);
      } catch (error) {
        this.logger.error(`Error updating product price after supplier removal for product ${productId}:`, error);
      }

      return {
        productId,
        stockCode: product.stok_kodu,
        supplier: supplierName,
        message: `${supplierName} tedarikçi bilgileri silindi`,
        removedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to remove supplier data for ${supplier} - product ${productId}:`,
        error,
      );
      throw error;
    }
  }
}