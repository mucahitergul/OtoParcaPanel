import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersController } from './suppliers.controller';
import { ScraperController } from './scraper.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { Product } from '../entities/product.entity';
import { PriceHistory } from '../entities/price-history.entity';
import { Settings } from '../entities/settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupplierPrice, Product, PriceHistory, Settings]),
  ],
  controllers: [SuppliersController, ScraperController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
