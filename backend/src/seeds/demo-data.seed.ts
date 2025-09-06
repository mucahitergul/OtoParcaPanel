import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { Settings } from '../entities/settings.entity';


export class DemoDataSeeder {
  constructor(private dataSource: DataSource) {}

  async seed() {
    console.log('🌱 Demo veriler oluşturuluyor...');

    // Admin kullanıcısı oluştur
    await this.createAdminUser();

    // Demo ürünler oluştur
    await this.createDemoProducts();

    // Demo toptancı fiyatları oluştur
    await this.createDemoSupplierPrices();

    // Sistem ayarlarını oluştur
    await this.createSystemSettings();

    console.log('✅ Demo veriler başarıyla oluşturuldu!');
  }

  private async createAdminUser() {
    const userRepository = this.dataSource.getRepository(User);

    // Admin kullanıcısının zaten var olup olmadığını kontrol et
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@otoparcapanel.com' },
    });

    if (existingAdmin) {
      console.log('👤 Admin kullanıcısı zaten mevcut');
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    const admin = userRepository.create({
      email: 'admin@otoparcapanel.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
      role: 'admin',
    });

    await userRepository.save(admin);
    console.log(
      '👤 Admin kullanıcısı oluşturuldu: admin@otoparcapanel.com / Admin123!',
    );
  }

  private async createDemoProducts() {
    const productRepository = this.dataSource.getRepository(Product);

    const demoProducts = [
      {
        woo_product_id: 1001,
        stok_kodu: 'FRN-001',
        urun_adi: 'Fren Balata Takımı - Ön',
        description: 'Yüksek kaliteli fren balata takımı, ön aksam için uygun',
        stok_miktari: 25,
        regular_price: 180.0,
        stock_status: 'instock' as 'instock' | 'outofstock' | 'onbackorder',
        manage_stock: true,
        is_active: true,
        sync_required: false,
      },
      {
        woo_product_id: 1002,
        stok_kodu: 'MTR-002',
        urun_adi: 'Motor Yağı 5W-30 4L',
        description: 'Sentetik motor yağı, tüm mevsim kullanımı',
        stok_miktari: 50,
        regular_price: 110.0,
        stock_status: 'instock',
        manage_stock: true,
        is_active: true,
        sync_required: false,
      },
      {
        woo_product_id: 1003,
        stok_kodu: 'FLT-003',
        urun_adi: 'Hava Filtresi',
        description: 'Yüksek filtrasyon kapasiteli hava filtresi',
        stok_miktari: 0,
        regular_price: 65.0,
        stock_status: 'outofstock' as 'instock' | 'outofstock' | 'onbackorder',
        manage_stock: true,
        is_active: true,
        sync_required: true,
      },
      {
        woo_product_id: 1004,
        stok_kodu: 'SUS-004',
        urun_adi: 'Amortisör Takımı - Arka',
        description: 'Hidrolik amortisör takımı, arka aksam',
        stok_miktari: 15,
        regular_price: 380.0,
        stock_status: 'instock' as 'instock' | 'outofstock' | 'onbackorder',
        manage_stock: true,
        is_active: true,
        sync_required: false,
      },
      {
        woo_product_id: 1005,
        stok_kodu: 'ELK-005',
        urun_adi: 'Far Ampulü H7 12V',
        description: 'Halogen far ampulü, uzun ömürlü',
        stok_miktari: 100,
        regular_price: 35.0,
        stock_status: 'instock' as 'instock' | 'outofstock' | 'onbackorder',
        manage_stock: true,
        is_active: true,
        sync_required: false,
      },
    ];

    for (const productData of demoProducts) {
      const existingProduct = await productRepository.findOne({
        where: { stok_kodu: productData.stok_kodu },
      });

      if (!existingProduct) {
        const product = productRepository.create(productData as any);
        await productRepository.save(product);
        console.log(`📦 Ürün oluşturuldu: ${productData.urun_adi}`);
      }
    }
  }

  private async createDemoSupplierPrices() {
    const supplierPriceRepository =
      this.dataSource.getRepository(SupplierPrice);
    const productRepository = this.dataSource.getRepository(Product);

    const products = await productRepository.find();
    const suppliers = ['Dinamik', 'Başbuğ', 'Doğuş'] as const;

    for (const product of products) {
      for (const supplier of suppliers) {
        const existingPrice = await supplierPriceRepository.findOne({
          where: {
            product_id: product.id,
            supplier_name: supplier,
          },
        });

        if (!existingPrice) {
          // Rastgele fiyat ve stok durumu oluştur
          const basePrice = product.regular_price;
          const priceVariation = Math.random() * 0.3 - 0.15; // ±15% varyasyon
          const supplierPrice = basePrice * (1 + priceVariation);

          const stockStatuses = [
            'instock',
            'outofstock',
            'onbackorder',
          ] as const;
          const randomStockStatus =
            stockStatuses[Math.floor(Math.random() * stockStatuses.length)];
          const stockQuantity =
            randomStockStatus === 'instock'
              ? Math.floor(Math.random() * 50) + 1
              : 0;

          const supplierPriceData = supplierPriceRepository.create({
            product_id: product.id,
            supplier_name: supplier,
            price: Math.round(supplierPrice * 100) / 100,
            stock_quantity: stockQuantity,
            stock_status: randomStockStatus,
            last_updated: new Date(),
            is_available: randomStockStatus !== 'outofstock',
            notes: `${supplier} tedarikçisi için otomatik oluşturulan fiyat`,
          });

          await supplierPriceRepository.save(supplierPriceData);
        }
      }
    }

    console.log('💰 Toptancı fiyatları oluşturuldu');
  }

  private async createSystemSettings() {
    const settingsRepository = this.dataSource.getRepository(Settings);

    // Varsayılan sistem ayarları
    const defaultSettings = [
      // Genel sistem ayarları
      { key: 'default_profit_margin', value: '15', description: 'Varsayılan kar marjı yüzdesi' },
      { key: 'auto_sync_enabled', value: 'true', description: 'Otomatik senkronizasyon aktif mi' },
      { key: 'sync_interval_minutes', value: '60', description: 'Senkronizasyon aralığı (dakika)' },
      { key: 'min_stock_threshold', value: '5', description: 'Minimum stok eşiği' },
      { key: 'max_price_change_percentage', value: '20', description: 'Maksimum fiyat değişim yüzdesi' },
      { key: 'python_scraper_api_url', value: 'http://localhost:8000', description: 'Python scraper API URL' },
      
      // WooCommerce ayarları (boş olarak başlatılır, admin panelinden doldurulur)
      { key: 'woocommerce_api_url', value: '', description: 'WooCommerce site URL' },
      { key: 'woocommerce_consumer_key', value: '', description: 'WooCommerce Consumer Key' },
      { key: 'woocommerce_consumer_secret', value: '', description: 'WooCommerce Consumer Secret' },
      
      // Tedarikçi kar marjları
      { key: 'dinamik_margin', value: '20', description: 'Dinamik tedarikçisi kar marjı' },
      { key: 'basbug_margin', value: '25', description: 'Başbuğ tedarikçisi kar marjı' },
      { key: 'dogus_margin', value: '22', description: 'Doğuş tedarikçisi kar marjı' },
    ];

    for (const settingData of defaultSettings) {
      // Ayarın zaten var olup olmadığını kontrol et
      const existingSetting = await settingsRepository.findOne({
        where: { key: settingData.key },
      });

      if (!existingSetting) {
        const setting = settingsRepository.create({
          key: settingData.key,
          value: settingData.value,
          description: settingData.description,
          created_at: new Date(),
          updated_at: new Date(),
        });

        await settingsRepository.save(setting);
        console.log(`✅ Sistem ayarı oluşturuldu: ${settingData.key}`);
      }
    }

    console.log('⚙️ Sistem ayarları oluşturuldu');
  }

}
