import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('supplier_prices')
export class SupplierPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column({
    type: 'enum',
    enum: ['Dinamik', 'Başbuğ', 'Doğuş'],
  })
  supplier_name: 'Dinamik' | 'Başbuğ' | 'Doğuş';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock_quantity: number;

  @Column({
    type: 'enum',
    enum: ['instock', 'outofstock', 'onbackorder'],
    default: 'outofstock',
  })
  stock_status: 'instock' | 'outofstock' | 'onbackorder';

  @Column({ default: false })
  is_available: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  additional_info: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Product, (product) => product.supplier_prices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Virtual properties
  get is_in_stock(): boolean {
    return this.stock_status === 'instock' && this.stock_quantity > 0;
  }

  get availability_status(): string {
    if (this.stock_status === 'instock' && this.stock_quantity > 0) {
      return 'available';
    } else if (this.stock_status === 'onbackorder') {
      return 'backorder';
    } else {
      return 'unavailable';
    }
  }
}
