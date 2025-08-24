import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret',
    });
  }

  async validate(payload: JwtPayload): Promise<Partial<User>> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Geçersiz token yapısı');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'emailVerified',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
        'lockedUntil',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız deaktif durumda');
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Hesabınız geçici olarak kilitlenmiştir');
    }

    // TODO: Check if token is blacklisted
    // const isBlacklisted = await this.authService.isTokenBlacklisted(token);
    // if (isBlacklisted) {
    //   throw new UnauthorizedException('Token geçersiz');
    // }

    return user;
  }
}
