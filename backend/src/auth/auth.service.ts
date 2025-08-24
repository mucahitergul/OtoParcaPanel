import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
  };
  token: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = registerDto;

    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('Bu email adresi zaten kullanılıyor');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(
        emailVerificationExpires.getHours() + 24,
      ); // 24 hours

      // Create user
      const user = this.userRepository.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        emailVerificationToken,
        emailVerificationExpires,
        isActive: true,
        emailVerified: false,
      });

      const savedUser = await this.userRepository.save(user);

      // Generate JWT tokens
      const tokens = await this.generateTokens(savedUser);

      // TODO: Send verification email
      // await this.sendVerificationEmail(savedUser.email, emailVerificationToken);

      return {
        success: true,
        message:
          'Kullanıcı başarıyla oluşturuldu. Lütfen email adresinizi doğrulayın.',
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName ?? undefined,
          lastName: savedUser.lastName ?? undefined,
          isActive: savedUser.isActive,
          emailVerified: savedUser.emailVerified,
          createdAt: savedUser.createdAt,
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Kullanıcı oluşturulurken bir hata oluştu',
      );
    }
  }

  async login(user: User): Promise<AuthResponse> {
    try {
      if (!user.isActive) {
        throw new UnauthorizedException('Hesabınız deaktif durumda');
      }

      // Generate JWT tokens
      const tokens = await this.generateTokens(user);

      // Update last login
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      return {
        success: true,
        message: 'Giriş başarılı',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Giriş işlemi sırasında bir hata oluştu',
      );
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (user && (await bcrypt.compare(password, user.password))) {
        return user;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message:
            'Eğer bu email adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour

      // Update user with reset token
      await this.userRepository.update(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      });

      // TODO: Send password reset email
      // await this.sendPasswordResetEmail(user.email, resetToken);

      return {
        success: true,
        message:
          'Eğer bu email adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Şifre sıfırlama işlemi sırasında bir hata oluştu',
      );
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          resetPasswordToken: token,
        },
      });

      if (!user) {
        throw new BadRequestException('Geçersiz veya süresi dolmuş token');
      }

      // Check if token is expired
      if (
        !user.resetPasswordExpires ||
        user.resetPasswordExpires < new Date()
      ) {
        throw new BadRequestException('Token süresi dolmuş');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password and clear reset token
      await this.userRepository.update(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });

      return {
        success: true,
        message: 'Şifre başarıyla güncellendi',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Şifre sıfırlama işlemi sırasında bir hata oluştu',
      );
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Mevcut şifre yanlış');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.userRepository.update(userId, {
        password: hashedPassword,
      });

      return {
        success: true,
        message: 'Şifre başarıyla değiştirildi',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Şifre değiştirme işlemi sırasında bir hata oluştu',
      );
    }
  }

  async getProfile(userId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı');
      }

      const {
        password,
        resetPasswordToken,
        resetPasswordExpires,
        emailVerificationToken,
        ...profile
      } = user;
      return {
        success: true,
        user: profile,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Profil bilgileri alınırken bir hata oluştu',
      );
    }
  }

  async logout(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return a success message
      return {
        success: true,
        message: 'Başarıyla çıkış yapıldı',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Çıkış işlemi sırasında bir hata oluştu',
      );
    }
  }

  async refreshToken(
    userId: number,
  ): Promise<{ success: boolean; token: string; refreshToken: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Kullanıcı bulunamadı veya deaktif');
      }

      const tokens = await this.generateTokens(user);

      return {
        success: true,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Token yenileme işlemi sırasında bir hata oluştu',
      );
    }
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          emailVerificationToken: token,
        },
      });

      if (!user) {
        throw new BadRequestException("Geçersiz doğrulama token'ı");
      }

      if (
        !user.emailVerificationExpires ||
        user.emailVerificationExpires < new Date()
      ) {
        throw new BadRequestException("Doğrulama token'ının süresi dolmuş");
      }

      // Update user as verified
      await this.userRepository.update(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      return {
        success: true,
        message: 'Email adresi başarıyla doğrulandı',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Email doğrulama işlemi sırasında bir hata oluştu',
      );
    }
  }

  async resendVerificationEmail(
    userId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı');
      }

      if (user.emailVerified) {
        throw new BadRequestException('Email adresi zaten doğrulanmış');
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(
        emailVerificationExpires.getHours() + 24,
      ); // 24 hours

      await this.userRepository.update(userId, {
        emailVerificationToken,
        emailVerificationExpires,
      });

      // TODO: Send verification email
      // await this.sendVerificationEmail(user.email, emailVerificationToken);

      return {
        success: true,
        message: 'Doğrulama emaili yeniden gönderildi',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Email gönderme işlemi sırasında bir hata oluştu',
      );
    }
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'defaultSecret',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'defaultRefreshSecret',
      expiresIn:
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return { accessToken, refreshToken };
  }

  // TODO: Implement email sending methods
  // private async sendVerificationEmail(email: string, token: string): Promise<void> {
  //   // Implement email sending logic
  // }

  // private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
  //   // Implement email sending logic
  // }
}
