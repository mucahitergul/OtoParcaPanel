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
      const limitNum = parseInt(limit) || 20;

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
   * Get products that need sync
   */
  @Get('needs-sync')
  async getProductsNeedingSync(@Query('limit') limit: string = '100') {
    try {
      const limitNum = parseInt(limit) || 100;
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
   * Get update history for a product
   */
  @Get(':id/history')
  async getUpdateHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit: string = '50',
  ) {
    try {
      const limitNum = parseInt(limit) || 50;
      const history = await this.productsService.getUpdateHistory(id, limitNum);
      return {
        success: true,
        data: history,
        count: history.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch update history for product ${id}`,
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
   * Update a product
   */
  @Put(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: {
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
  ) {
    try {
      const updatedProduct = await this.productsService.updateProduct(id, updateData);
      return {
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to update product ${id}`,
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Soft delete a product
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
}
