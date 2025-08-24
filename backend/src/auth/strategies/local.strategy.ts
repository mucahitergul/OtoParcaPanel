import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { User } from '../../entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<User> {
    // Validate input
    if (!email || !password) {
      throw new UnauthorizedException('Email ve şifre gereklidir');
    }

    const user = await this.authService.validateUser(email.trim(), password);
    if (!user) {
      throw new UnauthorizedException('Geçersiz email veya şifre');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız deaktif durumda');
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Hesabınız geçici olarak kilitlenmiştir');
    }

    return user;
  }
}
