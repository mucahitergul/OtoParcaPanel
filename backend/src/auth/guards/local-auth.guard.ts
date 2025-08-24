import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (info?.message) {
        throw new UnauthorizedException(info.message);
      }
      throw err || new UnauthorizedException('Giriş bilgileri geçersiz');
    }
    return user;
  }
}
