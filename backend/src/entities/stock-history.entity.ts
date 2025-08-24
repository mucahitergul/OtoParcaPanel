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

@Entity('stock_history')
export class StockHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({ type: 'int', nullable: true })
  old_stock: number;

  @Column({ type: 'int', nullable: true })
  new_stock: number;

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
  @ManyToOne(() => Product, (product) => product.stock_history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Virtual properties
  get stock_change(): number {
    if (this.old_stock === null || this.new_stock === null) return 0;
    return this.new_stock - this.old_stock;
  }

  get is_stock_increase(): boolean {
    return this.stock_change > 0;
  }

  get is_stock_decrease(): boolean {
    return this.stock_change < 0;
  }
}
