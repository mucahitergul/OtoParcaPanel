import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductSyncService } from './product-sync.service';
import { ProductSchedulerService } from './product-scheduler.service';
import { Product } from '../entities/product.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { WooCommerceModule } from '../woocommerce/woocommerce.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, SupplierPrice]),
    ScheduleModule.forRoot(),
    forwardRef(() => WooCommerceModule),
    SettingsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductSyncService, ProductSchedulerService],
  exports: [ProductsService, ProductSyncService, ProductSchedulerService],
})
export class ProductsModule {}
