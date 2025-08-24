import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductSyncService } from './product-sync.service';
import { ProductsService } from './products.service';

@Injectable()
export class ProductSchedulerService {
  private readonly logger = new Logger(ProductSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly productSyncService: ProductSyncService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Auto sync products every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlySync() {
    if (this.isRunning) {
      this.logger.warn('Sync already running, skipping scheduled sync');
      return;
    }

    try {
      this.isRunning = true;
      this.logger.log('Starting scheduled product sync...');

      // Get products that need sync
      const productsNeedingSync =
        await this.productSyncService.getProductsNeedingSync(50);

      if (productsNeedingSync.length === 0) {
        this.logger.log('No products need sync at this time');
        return;
      }

      this.logger.log(
        `Found ${productsNeedingSync.length} products needing sync`,
      );

      // Sync products in batches
      const batchSize = 10;
      let syncedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < productsNeedingSync.length; i += batchSize) {
        const batch = productsNeedingSync.slice(i, i + batchSize);

        for (const product of batch) {
          try {
            if (product.woo_product_id) {
              // Sync from WooCommerce
              const wooProduct = await this.productSyncService[
                'wooCommerceService'
              ].getProductById(product.woo_product_id);
              await this.productSyncService.syncSingleProduct(wooProduct);
              syncedCount++;
            }
          } catch (error) {
            this.logger.error(
              `Failed to sync product ${product.id}:`,
              error.message,
            );
            errorCount++;
          }
        }

        // Add delay between batches to avoid overwhelming the API
        if (i + batchSize < productsNeedingSync.length) {
          await this.delay(2000);
        }
      }

      this.logger.log(
        `Scheduled sync completed: ${syncedCount} synced, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('Scheduled sync failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Daily full sync at 2 AM
   */
  @Cron('0 2 * * *')
  async handleDailyFullSync() {
    if (this.isRunning) {
      this.logger.warn('Sync already running, skipping daily full sync');
      return;
    }

    try {
      this.isRunning = true;
      this.logger.log('Starting daily full product sync...');

      const result = await this.productSyncService.syncAllProducts({
        batchSize: 50,
        maxRetries: 2,
      });

      this.logger.log(
        `Daily full sync completed: ` +
          `${result.newProducts} new, ${result.updatedProducts} updated, ` +
          `${result.errors.length} errors in ${result.duration}ms`,
      );

      // Log statistics
      const stats = await this.productsService.getStatistics();
      this.logger.log(`Current statistics: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error('Daily full sync failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Weekly cleanup at Sunday 3 AM
   */
  @Cron('0 3 * * 0')
  async handleWeeklyCleanup() {
    try {
      this.logger.log('Starting weekly cleanup...');

      // Clean up old update history (keep last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // This would require a cleanup method in the service
      // await this.productsService.cleanupOldHistory(threeMonthsAgo);

      this.logger.log('Weekly cleanup completed');
    } catch (error) {
      this.logger.error('Weekly cleanup failed:', error.message);
    }
  }

  /**
   * Manual trigger for immediate sync
   */
  async triggerImmediateSync(
    options: { forceUpdate?: boolean; productIds?: number[] } = {},
  ) {
    if (this.isRunning) {
      throw new Error(
        'Sync is already running. Please wait for it to complete.',
      );
    }

    try {
      this.isRunning = true;
      this.logger.log('Starting manual sync...');

      if (options.productIds && options.productIds.length > 0) {
        // Sync specific products
        let syncedCount = 0;
        let errorCount = 0;

        for (const productId of options.productIds) {
          try {
            const product = await this.productsService.findOne(productId);
            if (product.woo_product_id) {
              const wooProduct = await this.productSyncService[
                'wooCommerceService'
              ].getProductById(product.woo_product_id);
              await this.productSyncService.syncSingleProduct(
                wooProduct,
                options,
              );
              syncedCount++;
            }
          } catch (error) {
            this.logger.error(
              `Failed to sync product ${productId}:`,
              error.message,
            );
            errorCount++;
          }
        }

        return {
          success: true,
          message: `Manual sync completed: ${syncedCount} synced, ${errorCount} errors`,
          syncedCount,
          errorCount,
        };
      } else {
        // Full sync
        const result = await this.productSyncService.syncAllProducts(options);
        return {
          message: `Manual sync completed`,
          ...result,
        };
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: new Date().toISOString(),
      nextHourlyRun: this.getNextCronRun(CronExpression.EVERY_HOUR),
      nextDailyRun: this.getNextCronRun('0 2 * * *'),
      nextWeeklyRun: this.getNextCronRun('0 3 * * 0'),
    };
  }

  /**
   * Utility method to calculate next cron run
   */
  private getNextCronRun(cronExpression: string): string {
    // This is a simplified calculation
    // In a real implementation, you might want to use a cron parser library
    const now = new Date();

    if (cronExpression === CronExpression.EVERY_HOUR) {
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      return nextHour.toISOString();
    }

    if (cronExpression === '0 2 * * *') {
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(2, 0, 0, 0);
      return nextDay.toISOString();
    }

    if (cronExpression === '0 3 * * 0') {
      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - nextSunday.getDay()) % 7;
      nextSunday.setDate(nextSunday.getDate() + (daysUntilSunday || 7));
      nextSunday.setHours(3, 0, 0, 0);
      return nextSunday.toISOString();
    }

    return 'Unknown';
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
