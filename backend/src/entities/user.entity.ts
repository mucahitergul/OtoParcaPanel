import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  lastName: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  role: string | null;

  @Column({ type: 'json', nullable: true })
  preferences: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  avatar: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  phone: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 10 })
  gender: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  company: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  jobTitle: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  website: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  location: string | null;

  @Column({ type: 'varchar', nullable: true, length: 10 })
  timezone: string | null;

  @Column({ type: 'varchar', nullable: true, length: 10 })
  language: string | null;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  twoFactorSecret: string | null;

  @Column({ type: 'json', nullable: true })
  twoFactorBackupCodes: string[] | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email;
  }

  get isLocked(): boolean {
    return this.lockedUntil ? this.lockedUntil > new Date() : false;
  }

  get displayName(): string {
    return this.fullName;
  }
}
