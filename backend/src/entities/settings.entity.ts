import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['string', 'number', 'boolean', 'json'],
    default: 'string',
  })
  data_type: 'string' | 'number' | 'boolean' | 'json';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual properties
  get parsed_value(): any {
    switch (this.data_type) {
      case 'number':
        return parseFloat(this.value);
      case 'boolean':
        return this.value === 'true';
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch {
          return null;
        }
      default:
        return this.value;
    }
  }

  // Static methods for common settings
  static getDefaultProfitMargin(): number {
    return 15; // Default 15%
  }

  static getDefaultSyncInterval(): number {
    return 60; // Default 60 minutes
  }
}
