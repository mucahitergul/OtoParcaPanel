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
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'oto_parca_panel',
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
