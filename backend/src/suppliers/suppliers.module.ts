import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersController } from './suppliers.controller';
import { ScraperController } from './scraper.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { Product } from '../entities/product.entity';
import { Settings } from '../entities/settings.entity';
import { SettingsModule } from '../settings/settings.module';
import { WooCommerceModule } from '../woocommerce/woocommerce.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupplierPrice, Product, Settings]),
    forwardRef(() => SettingsModule),
    forwardRef(() => WooCommerceModule),
  ],
  controllers: [SuppliersController, ScraperController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
