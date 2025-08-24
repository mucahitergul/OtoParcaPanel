import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('update_history')
export class UpdateHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column({
    type: 'enum',
    enum: ['Dinamik', 'Başbuğ', 'Doğuş', 'WooCommerce', 'Manual'],
  })
  supplier_name: 'Dinamik' | 'Başbuğ' | 'Doğuş' | 'WooCommerce' | 'Manual';

  @Column({
    type: 'enum',
    enum: ['price', 'stock', 'both', 'sync', 'create'],
  })
  update_type: 'price' | 'stock' | 'both' | 'sync' | 'create';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  old_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  new_price: number;

  @Column({ type: 'int', nullable: true })
  eski_stok: number;

  @Column({ type: 'int', nullable: true })
  yeni_stok: number;

  @Column({ type: 'text', nullable: true })
  eski_stok_durumu: string;

  @Column({ type: 'text', nullable: true })
  yeni_stok_durumu: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  change_details: Record<string, any>;

  @Column({ default: true })
  is_successful: boolean;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  guncelleme_tarihi: Date;

  // Relations
  @ManyToOne(() => Product, (product) => product.update_history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Virtual properties
  get has_price_change(): boolean {
    return (
      this.old_price !== null &&
      this.new_price !== null &&
      this.old_price !== this.new_price
    );
  }

  get has_stock_change(): boolean {
    return (
      this.eski_stok !== null &&
      this.yeni_stok !== null &&
      this.eski_stok !== this.yeni_stok
    );
  }

  get price_change_amount(): number {
    if (!this.has_price_change) return 0;
    return this.new_price - this.old_price;
  }

  get price_change_percentage(): number {
    if (!this.has_price_change || this.old_price === 0) return 0;
    return ((this.new_price - this.old_price) / this.old_price) * 100;
  }

  get stock_change_amount(): number {
    if (!this.has_stock_change) return 0;
    return this.yeni_stok - this.eski_stok;
  }
}
