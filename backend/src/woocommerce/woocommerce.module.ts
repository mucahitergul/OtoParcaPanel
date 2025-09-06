import { Module, forwardRef } from '@nestjs/common';
import { WooCommerceController } from './woocommerce.controller';
import { WooCommerceService } from './woocommerce.service';
import { SettingsModule } from '../settings/settings.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    forwardRef(() => SettingsModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [WooCommerceController],
  providers: [WooCommerceService],
  exports: [WooCommerceService],
})
export class WooCommerceModule {}
