import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { Product } from '../entities/product.entity';
import { PriceHistory } from '../entities/price-history.entity';
import { Settings } from '../entities/settings.entity';

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
    @InjectRepository(SupplierPrice)
    private supplierPriceRepository: Repository<SupplierPrice>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
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

    // Get profit margin
    const profitMarginSetting = await this.settingsRepository.findOne({
      where: { key: 'default_profit_margin' },
    });
    const profitMargin = profitMarginSetting
      ? parseFloat(profitMarginSetting.value)
      : 15;

    // Calculate new price
    const oldPrice = product.fiyat;
    const newCalculatedPrice =
      bestSupplierPrice.price * (1 + profitMargin / 100);

    // Update product
    await this.productRepository.update(productId, {
      best_supplier: bestSupplierPrice.supplier_name,
      calculated_price: newCalculatedPrice,
      fiyat: newCalculatedPrice,
      stok_miktari: bestSupplierPrice.stock_quantity,
      stock_status: bestSupplierPrice.stock_status,
      sync_required: true,
    });

    // Create price history record
    await this.priceHistoryRepository.save({
      product_id: productId,
      old_price: oldPrice,
      new_price: newCalculatedPrice,
      change_reason: `Best supplier selection: ${bestSupplierPrice.supplier_name}`,
      change_source: 'supplier_update',
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
   * Select best suppliers for multiple products
   */
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
}