import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('price_history')
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  old_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  new_price: number;

  @Column({ length: 100, nullable: true })
  change_reason: string;

  @Column({
    type: 'enum',
    enum: ['manual', 'auto_sync', 'supplier_update', 'woo_sync'],
    default: 'manual',
  })
  change_source: 'manual' | 'auto_sync' | 'supplier_update' | 'woo_sync';

  @CreateDateColumn()
  changed_at: Date;

  // Relations
  @ManyToOne(() => Product, (product) => product.price_history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Virtual properties
  get price_change(): number {
    if (!this.old_price || !this.new_price) return 0;
    return this.new_price - this.old_price;
  }

  get price_change_percentage(): number {
    if (!this.old_price || this.old_price === 0) return 0;
    return ((this.new_price - this.old_price) / this.old_price) * 100;
  }
}
