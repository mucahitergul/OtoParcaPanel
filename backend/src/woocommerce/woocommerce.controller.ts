import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WooCommerceService } from './woocommerce.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductSyncService } from '../products/product-sync.service';

@Controller('woocommerce')
@UseGuards(JwtAuthGuard)
export class WooCommerceController {
  constructor(
    private readonly wooCommerceService: WooCommerceService,
    private readonly productSyncService: ProductSyncService,
  ) {}

  /**
   * Test WooCommerce connection
   */
  @Get('test-connection')
  async testConnection() {
    try {
      const isConnected = await this.wooCommerceService.testConnection();
      return {
        success: isConnected,
        message: isConnected
          ? 'WooCommerce connection successful'
          : 'WooCommerce connection failed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to test WooCommerce connection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get WooCommerce configuration status
   */
  @Public()
  @Get('config-status')
  getConfigStatus() {
    return this.wooCommerceService.getConfigStatus();
  }

  /**
   * Get all products from WooCommerce
   */
  @Get('products')
  async getProducts(
    @Query('page') page: string = '1',
    @Query('per_page') perPage: string = '100',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const perPageNum = parseInt(perPage) || 100;

      const result = await this.wooCommerceService.getProductsWithPagination(
        pageNum,
        perPageNum,
      );

      return {
        success: true,
        data: result.products,
        pagination: {
          totalPages: result.totalPages,
          totalProducts: result.totalProducts,
          currentPage: result.currentPage,
          perPage: result.perPage
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch products from WooCommerce',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific product by ID
   */
  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    try {
      const productId = parseInt(id);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }

      const product = await this.wooCommerceService.getProductById(productId);
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
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get products by SKU
   */
  @Get('products/sku/:sku')
  async getProductBySku(@Param('sku') sku: string) {
    try {
      const products = await this.wooCommerceService.getProductBySku(sku);
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
          message: `Failed to fetch product with SKU ${sku}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update product stock
   */
  @Put('products/:id/stock')
  async updateProductStock(
    @Param('id') id: string,
    @Body() updateData: { stock_quantity: number },
  ) {
    try {
      const productId = parseInt(id);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
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

      const updatedProduct = await this.wooCommerceService.updateProductStock(
        productId,
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
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update product price
   */
  @Put('products/:id/price')
  async updateProductPrice(
    @Param('id') id: string,
    @Body() updateData: { price: string },
  ) {
    try {
      const productId = parseInt(id);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }

      if (!updateData.price || isNaN(parseFloat(updateData.price))) {
        throw new HttpException('Invalid price', HttpStatus.BAD_REQUEST);
      }

      const updatedProduct = await this.wooCommerceService.updateProductPrice(
        productId,
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
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync all products from WooCommerce
   */
  @Post('sync-products')
  async syncProducts(
    @Body() options: { forceUpdate?: boolean; batchSize?: number } = {},
  ) {
    try {
      // Reload WooCommerce configuration from database before syncing
      await this.wooCommerceService.reloadConfig();
      
      const result = await this.productSyncService.syncAllProducts(options);
      return {
        success: result.success,
        message: result.success
          ? `Successfully synced ${result.totalProducts} products (${result.newProducts} new, ${result.updatedProducts} updated)`
          : 'Sync completed with errors',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to sync products from WooCommerce',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Start batch sync with progress tracking
   */
  @Post('sync-products-batch')
  async syncProductsBatch(
    @Body() options: { forceUpdate?: boolean; batchSize?: number } = {},
  ) {
    try {
      // Reload WooCommerce configuration from database before syncing
      await this.wooCommerceService.reloadConfig();
      
      const syncId = await this.productSyncService.startBatchSync(options);
      return {
        success: true,
        message: 'Batch sync started successfully',
        data: { syncId },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to start batch sync',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get batch sync progress
   */
  @Get('sync-progress/:syncId')
  async getSyncProgress(@Param('syncId') syncId: string) {
    try {
      const progress = await this.productSyncService.getSyncProgress(syncId);
      return {
        success: true,
        data: progress,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get sync progress',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel batch sync
   */
  @Post('cancel-sync/:syncId')
  async cancelSync(@Param('syncId') syncId: string) {
    try {
      const cancelled = await this.productSyncService.cancelSync(syncId);
      return {
        success: cancelled,
        message: cancelled ? 'Sync cancelled successfully' : 'Sync not found or already completed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to cancel sync',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Pause batch sync
   */
  @Post('pause-sync/:syncId')
  async pauseSync(@Param('syncId') syncId: string) {
    try {
      const paused = await this.productSyncService.pauseSync(syncId);
      return {
        success: paused,
        message: paused ? 'Sync paused successfully' : 'Sync not found or not running',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to pause sync',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Resume batch sync
   */
  @Post('resume-sync/:syncId')
  async resumeSync(@Param('syncId') syncId: string) {
    try {
      const resumed = await this.productSyncService.resumeSync(syncId);
      return {
        success: resumed,
        message: resumed ? 'Sync resumed successfully' : 'Sync not found or not paused',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to resume sync',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all active syncs
   */
  @Get('active-syncs')
  async getActiveSyncs() {
    try {
      const activeSyncs = await this.productSyncService.getActiveSyncs();
      return {
        success: true,
        data: activeSyncs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get active syncs',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk update products
   */
  @Put('products/bulk-update')
  async bulkUpdateProducts(
    @Body()
    updateData: {
      updates: Array<{
        id: number;
        stock_quantity?: number;
        price?: string;
        regular_price?: string;
        sale_price?: string;
        manage_stock?: boolean;
        stock_status?: 'instock' | 'outofstock' | 'onbackorder';
      }>;
    },
  ) {
    try {
      if (!updateData.updates || !Array.isArray(updateData.updates)) {
        throw new HttpException('Invalid updates data', HttpStatus.BAD_REQUEST);
      }

      const updatedProducts = await this.wooCommerceService.updateProductsBulk(
        updateData.updates,
      );

      return {
        success: true,
        message: `Successfully updated ${updatedProducts.length} products`,
        data: updatedProducts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk update products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync product with calculated price
   */
  @Put('products/:id/sync-calculated-price')
  async syncProductWithCalculatedPrice(
    @Param('id') id: string,
    @Body() syncData: { calculated_price: number; stock_quantity: number },
  ) {
    try {
      const productId = parseInt(id);
      if (isNaN(productId)) {
        throw new HttpException('Invalid product ID', HttpStatus.BAD_REQUEST);
      }

      if (
        typeof syncData.calculated_price !== 'number' ||
        typeof syncData.stock_quantity !== 'number'
      ) {
        throw new HttpException('Invalid sync data', HttpStatus.BAD_REQUEST);
      }

      const syncedProduct =
        await this.wooCommerceService.syncProductWithCalculatedPrice(
          productId,
          syncData.calculated_price,
          syncData.stock_quantity,
        );

      return {
        success: true,
        message: 'Product synced with calculated price successfully',
        data: syncedProduct,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to sync product ${id} with calculated price`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get products that need synchronization
   */
  @Get('products/needs-sync')
  async getProductsNeedingSync() {
    try {
      const products = await this.wooCommerceService.getProductsNeedingSync();
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
   * Update WooCommerce configuration from settings
   */
  @Post('update-config')
  async updateConfig() {
    try {
      await this.wooCommerceService.updateConfigFromSettings();
      return {
        success: true,
        message: 'WooCommerce configuration updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update WooCommerce configuration',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
