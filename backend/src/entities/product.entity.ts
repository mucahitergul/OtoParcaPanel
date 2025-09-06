import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SupplierPrice } from './supplier-price.entity';
import { StockHistory } from './stock-history.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  woo_product_id: number;

  @Column({ length: 100, unique: true })
  stok_kodu: string;

  @Column({ length: 500 })
  urun_adi: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stok_miktari: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  regular_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sale_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  calculated_price: number;

  @Column({
    type: 'enum',
    enum: ['Dinamik', 'Başbuğ', 'Doğuş'],
    nullable: true,
  })
  best_supplier: 'Dinamik' | 'Başbuğ' | 'Doğuş' | null;

  @Column({ default: true })
  manage_stock: boolean;

  @Column({
    type: 'enum',
    enum: ['instock', 'outofstock', 'onbackorder'],
    default: 'instock',
  })
  stock_status: 'instock' | 'outofstock' | 'onbackorder';

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  short_description: string;

  @Column({ type: 'text', nullable: true })
  aciklama: string;

  @Column({ type: 'text', nullable: true })
  kategori: string;

  @Column({ type: 'json', nullable: true })
  categories: Array<{ id: number; name: string; slug: string }>;

  @Column({ type: 'json', nullable: true })
  images: Array<{ id: number; src: string; alt: string }>;

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  supplier_tags: string[];

  @Column({ type: 'json', nullable: true })
  woo_tags: string[];

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  woo_date_created: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  woo_date_modified: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_date: Date | null;

  @Column({ default: false })
  sync_required: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => SupplierPrice, (supplierPrice) => supplierPrice.product)
  supplier_prices: SupplierPrice[];

  @OneToMany(() => StockHistory, (stockHistory) => stockHistory.product)
  stock_history: StockHistory[];

  // Virtual properties
  get has_stock(): boolean {
    return this.stok_miktari > 0;
  }

  get needs_sync(): boolean {
    if (!this.last_sync_date) return true;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return new Date(this.last_sync_date) < oneDayAgo || this.sync_required;
  }

  get best_supplier_price(): SupplierPrice | null {
    if (!this.supplier_prices || this.supplier_prices.length === 0) {
      return null;
    }

    return (
      this.supplier_prices
        .filter((sp) => sp.stock_status === 'instock' && sp.is_available)
        .sort((a, b) => a.price - b.price)[0] || null
    );
  }

  get current_price(): number {
    return this.calculated_price || this.regular_price;
  }

  get current_stock(): number {
    return this.stok_miktari;
  }
}
