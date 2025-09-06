import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';

@Injectable()
export class AdminUserSeed {
  private readonly logger = new Logger(AdminUserSeed.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async run(): Promise<void> {
    try {
      const adminEmail = 'admin@otoparcapanel.com';
      const adminPassword = 'Admin123!';

      // Check if admin user already exists
      const existingAdmin = await this.userRepository.findOne({
        where: { email: adminEmail },
      });

      if (existingAdmin) {
        this.logger.log('Admin user already exists');
        return;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

      // Create admin user
      const adminUser = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        emailVerified: true,
        role: 'admin',
      });

      await this.userRepository.save(adminUser);
      this.logger.log('Admin user created successfully');
    } catch (error) {
      this.logger.error('Error creating admin user:', error.message);
      throw error;
    }
  }
}