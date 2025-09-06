import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ProductsService, ProductFilter } from './products.service';
import { ProductSyncService } from './product-sync.service';
import { ProductSchedulerService } from './product-scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import {
  BulkSyncDto,
  BulkDeleteDto,
  BulkPriceUpdateDto,
  BulkStockUpdateDto,
  BulkExportDto,
  BulkOperationResultDto,
} from './dto/bulk-operations.dto';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly productSyncService: ProductSyncService,
    private readonly productSchedulerService: ProductSchedulerService,
  ) {}

  /**
   * Get all products with filtering and pagination
   */
  @Get()
  @Public()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('stockStatus')
    stockStatus?: 'instock' | 'outofstock' | 'onbackorder',
    @Query('hasStock') hasStock?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('supplier') supplier?: 'Dinamik' | 'Başbuğ' | 'Doğuş',
    @Query('needsSync') needsSync?: string,
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      let limitNum = parseInt(limit) || 20;
      
      // Eğer limit çok yüksekse (10000+), tüm ürünleri getir
      if (limitNum >= 10000) {
        limitNum = 999999; // Çok yüksek bir değer - tüm ürünleri getir
      }

      const filters: ProductFilter = {
        search,
        category,
        stockStatus,
        hasStock:
          hasStock === 'true' ? true : hasStock === 'false' ? false : undefined,
        priceMin: priceMin ? parseFloat(priceMin) : undefined,
        priceMax: priceMax ? parseFloat(priceMax) : undefined,
        supplier,
        needsSync:
          needsSync === 'true'
            ? true
            : needsSync === 'false'
              ? false
              : undefined,
      };

      const result = await this.productsService.findAll(
        pageNum,
        limitNum,
        filters,
      );

      return {
        success: true,
        data: result.products,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get product statistics
   */
  @Get('statistics')
  @Public()
  async getStatistics() {
    try {
      const stats = await this.productsService.getStatistics();
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch statistics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync all products from WooCommerce
   */
  @Post('sync')
  async syncProducts(
    @Body() options: { forceUpdate?: boolean; batchSize?: number } = {},
  ) {
    try {
      const result = await this.productSyncService.syncAllProducts(options);
      return {
        success: result.success,
        message: result.success
          ? 'Products synced successfully'
          : 'Sync completed with errors',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to sync products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Push local prices to WooCommerce
   */
  @Post('push-to-woocommerce')
  async pushToWooCommerce(
    @Body() options: { productIds?: number[]; batchSize?: number } = {},
  ) {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🚀 Starting WooCommerce sync with options: ${JSON.stringify(options)}`);
      
      const result = await this.productsService.pushPricesToWooCommerce(options);
      const duration = Date.now() - startTime;
      
      let message: string;
      let statusCode = HttpStatus.OK;
      
      if (result.success) {
        message = `🎉 Successfully pushed ${result.updatedCount} products to WooCommerce in ${duration}ms`;
        this.logger.log(message);
      } else if (result.updatedCount > 0 && result.errorCount > 0) {
        message = `⚠️ Push completed with mixed results: ${result.updatedCount} successful, ${result.errorCount} failed in ${duration}ms`;
        statusCode = HttpStatus.PARTIAL_CONTENT;
        this.logger.warn(message);
      } else if (result.errorCount > 0) {
        message = `❌ Push failed: ${result.errorCount} errors occurred in ${duration}ms`;
        statusCode = HttpStatus.BAD_REQUEST;
        this.logger.error(message);
      } else {
        message = `ℹ️ No products were processed in ${duration}ms`;
        this.logger.log(message);
      }
      
      return {
        success: result.success,
        message,
        data: {
          ...result,
          duration: `${duration}ms`,
          processedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`💥 WooCommerce sync failed after ${duration}ms:`, {
        error: error.message,
        stack: error.stack,
        options
      });
      
      throw new HttpException(
        {
          success: false,
          message: `Failed to push prices to WooCommerce: ${error.message}`,
          error: error.message,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get products that need sync
   */
  @Get('needs-sync')
  async getProductsNeedingSync(@Query('limit') limit: string = '1000') {
    try {
      const limitNum = parseInt(limit) || 1000;
      const products =
        await this.productSyncService.getProductsNeedingSync(limitNum);

      return {
        success: true,
        data: products,
        count: products.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch products needing sync',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  /**
   * Update supplier tags for multiple products
   */
  @Post('bulk/update-tags')
  @Public()
  async bulkUpdateSupplierTags(
    @Body() data: { productIds?: number[] } = {},
  ) {
    try {
      const result = await this.productsService.bulkUpdateSupplierTags(
        data.productIds,
      );
      return {
        success: true,
        message: `Supplier tags updated for ${result.updatedCount} products`,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk update supplier tags',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  /**
   * Get a single product by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const product = await this.productsService.findOne(id);
      return {
        success: true,
        data: product,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch product ${id}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get product by SKU
   */
  @Get('sku/:sku')
  async findBySku(@Param('sku') sku: string) {
    try {
      const product = await this.productsService.findBySku(sku);
      return {
        success: true,
        data: product,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch product with SKU ${sku}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get supplier prices for a product
   */
  @Get(':id/supplier-prices')
  async getSupplierPrices(@Param('id', ParseIntPipe) id: number) {
    try {
      const supplierPrices = await this.productsService.getSupplierPrices(id);
      return {
        success: true,
        data: supplierPrices,
        count: supplierPrices.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch supplier prices for product ${id}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  /**
   * Update product stock
   */
  @Put(':id/stock')
  async updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: { stock_quantity: number },
  ) {
    try {
      if (
        typeof updateData.stock_quantity !== 'number' ||
        updateData.stock_quantity < 0
      ) {
        throw new HttpException(
          'Invalid stock quantity',
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedProduct = await this.productsService.updateStock(
        id,
        updateData.stock_quantity,
      );

      return {
        success: true,
        message: 'Product stock updated successfully',
        data: updatedProduct,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to update stock for product ${id}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update product price
   */
  @Put(':id/price')
  async updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: { price: number },
  ) {
    try {
      if (typeof updateData.price !== 'number' || updateData.price < 0) {
        throw new HttpException('Invalid price', HttpStatus.BAD_REQUEST);
      }

      const updatedProduct = await this.productsService.updatePrice(
        id,
        updateData.price,
      );

      return {
        success: true,
        message: 'Product price updated successfully',
        data: updatedProduct,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to update price for product ${id}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update supplier price
   */
  @Put(':id/supplier-price')
  async updateSupplierPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateData: {
      supplier: 'Dinamik' | 'Başbuğ' | 'Doğuş';
      price: number;
      stock_quantity: number;
      stock_status: 'instock' | 'outofstock' | 'onbackorder';
    },
  ) {
    try {
      if (
        !updateData.supplier ||
        !['Dinamik', 'Başbuğ', 'Doğuş'].includes(updateData.supplier)
      ) {
        throw new HttpException('Invalid supplier', HttpStatus.BAD_REQUEST);
      }

      if (typeof updateData.price !== 'number' || updateData.price < 0) {
        throw new HttpException('Invalid price', HttpStatus.BAD_REQUEST);
      }

      if (
        typeof updateData.stock_quantity !== 'number' ||
        updateData.stock_quantity < 0
      ) {
        throw new HttpException(
          'Invalid stock quantity',
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedSupplierPrice =
        await this.productsService.updateSupplierPrice(
          id,
          updateData.supplier,
          updateData.price,
          updateData.stock_quantity,
          updateData.stock_status,
        );

      return {
        success: true,
        message: 'Supplier price updated successfully',
        data: updatedSupplierPrice,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to update supplier price for product ${id}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mark products for sync
   */
  @Post('mark-for-sync')
  async markForSync(@Body() data: { productIds: number[] }) {
    try {
      if (!Array.isArray(data.productIds) || data.productIds.length === 0) {
        throw new HttpException('Invalid product IDs', HttpStatus.BAD_REQUEST);
      }

      await this.productSyncService.markProductsForSync(data.productIds);

      return {
        success: true,
        message: `${data.productIds.length} products marked for sync`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to mark products for sync',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get sync status
   */
  @Get('sync/status')
  async getSyncStatus() {
    try {
      const status = this.productSchedulerService.getSyncStatus();
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get sync status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger immediate sync
   */
  @Post('sync/immediate')
  async triggerImmediateSync(
    @Body() options: { forceUpdate?: boolean; productIds?: number[] } = {},
  ) {
    try {
      const result =
        await this.productSchedulerService.triggerImmediateSync(options);
      return {
        success: result.success,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to trigger immediate sync',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update supplier tags for a single product
   */
  @Post(':id/update-tags')
  @Public()
  async updateSupplierTags(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.productsService.updateSupplierTags(id);
      return {
        success: true,
        message: 'Supplier tags updated successfully',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update supplier tags',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test WooCommerce sync for a specific product
   */
  @Post(':id/test-woo-sync')
  @Public()
  async testWooCommerceSync(@Param('id', ParseIntPipe) id: number) {
    try {
      const product = await this.productsService.findOne(id);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      if (!product.woo_product_id) {
        throw new HttpException(
          'Product has no WooCommerce ID',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Force sync to WooCommerce
      await this.productsService.syncSingleProductToWooCommerce(product);

      return {
        success: true,
        message: 'Product successfully synced to WooCommerce',
        data: {
          product_id: product.id,
          woo_product_id: product.woo_product_id,
          regular_price: product.regular_price,
          sale_price: product.sale_price,
          stock_quantity: product.stok_miktari,
          stock_status: product.stock_status,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to sync product to WooCommerce',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync single product
   */
  @Post('sync-single')
  async syncSingleProduct(
    @Body() data: { productId: number },
  ) {
    try {
      const product = await this.productsService.findOne(data.productId);
      
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      if (!product.woo_product_id) {
        throw new HttpException('Product has no WooCommerce ID', HttpStatus.BAD_REQUEST);
      }

      // Sync the product to WooCommerce
      await this.productsService.syncSingleProductToWooCommerce(product);
      
      return {
        success: true,
        message: `Product ${product.urun_adi} synced successfully`,
        data: {
          productId: product.id,
          productName: product.urun_adi,
          wooProductId: product.woo_product_id
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to sync product: ${error.message}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk sync products
   */
  @Post('bulk/sync')
  async bulkSync(
    @Body() bulkSyncDto: BulkSyncDto,
  ): Promise<BulkOperationResultDto> {
    try {
      const result = await this.productsService.bulkSync(bulkSyncDto);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk sync products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk delete products
   */
  @Post('bulk/delete')
  async bulkDelete(
    @Body() bulkDeleteDto: BulkDeleteDto,
  ): Promise<BulkOperationResultDto> {
    try {
      const result = await this.productsService.bulkDelete(bulkDeleteDto);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk delete products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk update product prices
   */
  @Post('bulk/price-update')
  async bulkPriceUpdate(
    @Body() bulkPriceUpdateDto: BulkPriceUpdateDto,
  ): Promise<BulkOperationResultDto> {
    try {
      const result =
        await this.productsService.bulkPriceUpdate(bulkPriceUpdateDto);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk update prices',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk update product stock
   */
  @Post('bulk/stock-update')
  async bulkStockUpdate(
    @Body() bulkStockUpdateDto: BulkStockUpdateDto,
  ): Promise<BulkOperationResultDto> {
    try {
      const result =
        await this.productsService.bulkStockUpdate(bulkStockUpdateDto);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk update stock',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk export products
   */
  @Post('bulk/export')
  async bulkExport(
    @Body() bulkExportDto: BulkExportDto,
  ): Promise<BulkOperationResultDto> {
    try {
      const result = await this.productsService.bulkExport(bulkExportDto);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to export products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a product with comprehensive validation and error handling
   */
  @Put(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: {
      urun_adi: string;
      stok_kodu: string;
      fiyat: number | string;
      stok_miktari: number | string;
      stock_status: 'instock' | 'outofstock' | 'onbackorder';
      regular_price?: number | string;
      sale_price?: number | string;
    },
  ) {
    try {
      this.logger.log(`Received product update request for ID: ${id}`);
      this.logger.debug(`Update data:`, updateData);
      
      // Validate required fields
      if (!updateData.urun_adi || updateData.urun_adi.trim().length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'Product name is required',
            field: 'urun_adi',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      if (!updateData.stok_kodu || updateData.stok_kodu.trim().length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'Stock code is required',
            field: 'stok_kodu',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Convert and validate numeric values
      const processedData = {
        urun_adi: updateData.urun_adi.trim(),
        stok_kodu: updateData.stok_kodu.trim(),
        regular_price: this.parseAndValidateNumber(updateData.regular_price || updateData.fiyat, 'regular_price', 'Regular price'),
        stok_miktari: this.parseAndValidateNumber(updateData.stok_miktari, 'stok_miktari', 'Stock quantity'),
        stock_status: updateData.stock_status,
        sale_price: updateData.sale_price !== undefined ? 
          this.parseAndValidateNumber(updateData.sale_price, 'sale_price', 'Sale price', false) : undefined,
      };
      
      // Validate stock status
      if (!['instock', 'outofstock', 'onbackorder'].includes(processedData.stock_status)) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid stock status. Must be one of: instock, outofstock, onbackorder',
            field: 'stock_status',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      this.logger.log(`Processed data for product ${id}:`, processedData);
      
      // Update the product
      const updatedProduct = await this.productsService.updateProduct(id, processedData);
      
      this.logger.log(`Product ${id} updated successfully`);
      
      return {
        success: true,
        message: 'Product updated successfully',
        data: {
          id: updatedProduct.id,
          urun_adi: updatedProduct.urun_adi,
          stok_kodu: updatedProduct.stok_kodu,
          regular_price: updatedProduct.regular_price,
          stok_miktari: updatedProduct.stok_miktari,
          stock_status: updatedProduct.stock_status,
          sale_price: updatedProduct.sale_price,
          sync_required: updatedProduct.sync_required,
          last_sync_date: updatedProduct.last_sync_date,
          updated_at: updatedProduct.updated_at,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update product ${id}:`, error.message);
      
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Handle specific error types
      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            success: false,
            message: `Product with ID ${id} not found`,
            error: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      if (error.message.includes('validation') || error.message.includes('required')) {
        throw new HttpException(
          {
            success: false,
            message: 'Validation error',
            error: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Generic server error
      throw new HttpException(
        {
          success: false,
          message: `Failed to update product ${id}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  /**
   * Parse and validate numeric values
   */
  private parseAndValidateNumber(value: number | string, fieldName: string, displayName: string, required: boolean = true): number {
    if ((value === undefined || value === null || value === '') && !required) {
      return 0;
    }
    
    let numValue: number;
    
    if (typeof value === 'string') {
      numValue = parseFloat(value);
    } else {
      numValue = value;
    }
    
    if (isNaN(numValue)) {
      throw new HttpException(
        {
          success: false,
          message: `${displayName} must be a valid number`,
          field: fieldName,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    
    if (numValue < 0) {
      throw new HttpException(
        {
          success: false,
          message: `${displayName} cannot be negative`,
          field: fieldName,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    
    return numValue;
  }

  /**
   * Bulk sync products
   */
  @Post('bulk/sync')

  /**
   * Hard delete a product
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.productsService.remove(id);
      return {
        success: true,
        message: 'Product deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to delete product ${id}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  /**
   * Update supplier data from scraper
   */
  @Post('update-supplier-data')
  @Public()
  async updateSupplierData(
    @Body()
    updateData: {
      productId: number;
      supplier: 'Dinamik' | 'Başbuğ' | 'Doğuş';
      price: number;
      stock: number;
      stockStatus: 'instock' | 'outofstock' | 'onbackorder';
    },
  ) {
    try {
      const { productId, supplier, price, stock, stockStatus } = updateData;

      // Validate input data
      if (!productId || !supplier || typeof price !== 'number' || typeof stock !== 'number') {
        throw new HttpException('Invalid input data', HttpStatus.BAD_REQUEST);
      }

      if (!['Dinamik', 'Başbuğ', 'Doğuş'].includes(supplier)) {
        throw new HttpException('Invalid supplier', HttpStatus.BAD_REQUEST);
      }

      // Update supplier price using existing service method
      const updatedSupplierPrice = await this.productsService.updateSupplierPrice(
        productId,
        supplier,
        price,
        stock,
        stockStatus,
      );

      return {
        success: true,
        message: 'Supplier data updated successfully',
        data: updatedSupplierPrice,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update supplier data: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update supplier data',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  


  /**
   * Delete all products permanently
   */
  @Post('delete-all')
  async deleteAllProducts() {
    try {
      this.logger.log('🗑️ Starting to delete all products...');
      const result = await this.productsService.deleteAllProducts();
      
      this.logger.log(`✅ Delete all completed: ${result.totalDeleted} products deleted`);
      
      return {
        success: result.success,
        message: result.message,
        data: {
          totalDeleted: result.totalDeleted,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to delete all products:', error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete all products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
