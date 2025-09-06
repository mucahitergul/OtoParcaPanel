import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import * as crypto from 'crypto';

// Ensure crypto is available globally
if (typeof global !== 'undefined' && !(global as any).crypto) {
  (global as any).crypto = crypto;
}
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WooCommerceModule } from './woocommerce/woocommerce.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SettingsModule } from './settings/settings.module';
import { SystemModule } from './system/system.module';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { SupplierPrice } from './entities/supplier-price.entity';


import { StockHistory } from './entities/stock-history.entity';
import { Settings } from './entities/settings.entity';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { WooCommerceRateLimitMiddleware } from './common/middleware/woocommerce-rate-limit.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { LoggingMiddleware } from './common/middleware/logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST') || 'localhost',
        port: configService.get('DB_PORT') || 5432,
        username: configService.get('DB_USER') || 'postgres',
        password: configService.get('DB_PASS') || 'mucahit01.',
        database: configService.get('DB_NAME') || 'carapp',
        entities: [
          User,
          Product,
          SupplierPrice,
          StockHistory,
          Settings,
        ],
        synchronize: true, // Enable for development
        dropSchema: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    WooCommerceModule,
    ProductsModule,
    SuppliersModule,
    SettingsModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, LoggingMiddleware, RateLimitMiddleware)
      .forRoutes('*');

    // WooCommerce specific rate limiting temporarily disabled
    // consumer
    //   .apply(WooCommerceRateLimitMiddleware)
    //   .forRoutes({ path: 'woocommerce*', method: RequestMethod.ALL }, { path: 'products/sync*', method: RequestMethod.ALL });
  }
}
