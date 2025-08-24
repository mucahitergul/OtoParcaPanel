import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store: RateLimitStore = {};
  private readonly windowMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxRequests = 500; // Max requests per window

  use(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting for login endpoint to prevent lockout
    if (req.path.includes('/auth/login')) {
      return next();
    }

    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    // Get or create client entry
    if (!this.store[clientIp]) {
      this.store[clientIp] = {
        count: 0,
        resetTime: now + this.windowMs,
      };
    }

    const clientData = this.store[clientIp];

    // Reset if window has expired
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + this.windowMs;
    }

    // Increment request count
    clientData.count++;

    // Check if limit exceeded
    if (clientData.count > this.maxRequests) {
      throw new HttpException(
        {
          message:
            'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.maxRequests - clientData.count),
    );
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));

    next();
  }

  private cleanupExpiredEntries(now: number) {
    Object.keys(this.store).forEach((key) => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}
