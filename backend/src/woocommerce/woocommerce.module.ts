import { Module, forwardRef } from '@nestjs/common';
import { WooCommerceController } from './woocommerce.controller';
import { WooCommerceService } from './woocommerce.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [forwardRef(() => SettingsModule)],
  controllers: [WooCommerceController],
  providers: [WooCommerceService],
  exports: [WooCommerceService],
})
export class WooCommerceModule {}
