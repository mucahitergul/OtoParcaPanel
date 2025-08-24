import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { UpdateHistory } from '../entities/update-history.entity';
import { PriceHistory } from '../entities/price-history.entity';
import { StockHistory } from '../entities/stock-history.entity';
import { Settings } from '../entities/settings.entity';
import { DemoDataSeeder } from './demo-data.seed';

// .env dosyasını yükle
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'mucahit01.',
  database: process.env.DB_NAME || 'otoparca_panel',
  entities: [User, Product, SupplierPrice, UpdateHistory, PriceHistory, StockHistory, Settings],
  synchronize: true, // Seeder çalıştırırken tabloları oluştur
  dropSchema: true, // Mevcut şemayı sil ve yeniden oluştur
  logging: false,
});

async function runSeeder() {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    await AppDataSource.initialize();
    console.log('✅ Veritabanı bağlantısı başarılı');

    const seeder = new DemoDataSeeder(AppDataSource);
    await seeder.seed();

    console.log('🎉 Seeder başarıyla tamamlandı!');
  } catch (error) {
    console.error('❌ Seeder hatası:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Veritabanı bağlantısı kapatıldı');
    }
    process.exit(0);
  }
}

runSeeder();
