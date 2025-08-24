import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductSyncService } from './product-sync.service';
import { ProductSchedulerService } from './product-scheduler.service';
import { Product } from '../entities/product.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { UpdateHistory } from '../entities/update-history.entity';
import { WooCommerceModule } from '../woocommerce/woocommerce.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, SupplierPrice, UpdateHistory]),
    ScheduleModule.forRoot(),
    WooCommerceModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductSyncService, ProductSchedulerService],
  exports: [ProductsService, ProductSyncService, ProductSchedulerService],
})
export class ProductsModule {}
