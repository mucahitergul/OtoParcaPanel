import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface WooCommerceRateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    lastRequest: number;
  };
}

@Injectable()
export class WooCommerceRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WooCommerceRateLimitMiddleware.name);
  private store: WooCommerceRateLimitStore = {};

  // WooCommerce API specific limits
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxRequests = 50; // Max requests per minute for WooCommerce
  private readonly minInterval = 1000; // Minimum 1 second between requests

  use(req: Request, res: Response, next: NextFunction) {
    // Only apply to WooCommerce related endpoints
    if (!this.isWooCommerceEndpoint(req.path)) {
      return next();
    }

    const clientKey = this.getClientKey(req);
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    // Get or create client entry
    if (!this.store[clientKey]) {
      this.store[clientKey] = {
        count: 0,
        resetTime: now + this.windowMs,
        lastRequest: 0,
      };
    }

    const clientData = this.store[clientKey];

    // Reset if window has expired
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + this.windowMs;
    }

    // Check minimum interval between requests
    if (
      clientData.lastRequest > 0 &&
      now - clientData.lastRequest < this.minInterval
    ) {
      const waitTime = this.minInterval - (now - clientData.lastRequest);
      this.logger.warn(
        `Rate limit: Request too frequent from ${clientKey}, wait ${waitTime}ms`,
      );

      throw new HttpException(
        {
          message:
            'Requests are too frequent. Please wait before making another request.',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: Math.ceil(waitTime / 1000),
          type: 'FREQUENCY_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment request count
    clientData.count++;
    clientData.lastRequest = now;

    // Check if limit exceeded
    if (clientData.count > this.maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for ${clientKey}: ${clientData.count}/${this.maxRequests}`,
      );

      throw new HttpException(
        {
          message:
            'WooCommerce API rate limit exceeded. Please try again later.',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
          type: 'RATE_LIMIT',
          limit: this.maxRequests,
          remaining: 0,
          resetTime: clientData.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add rate limit headers
    res.setHeader('X-WooCommerce-RateLimit-Limit', this.maxRequests);
    res.setHeader(
      'X-WooCommerce-RateLimit-Remaining',
      Math.max(0, this.maxRequests - clientData.count),
    );
    res.setHeader(
      'X-WooCommerce-RateLimit-Reset',
      Math.ceil(clientData.resetTime / 1000),
    );
    res.setHeader('X-WooCommerce-RateLimit-Window', this.windowMs / 1000);

    this.logger.debug(
      `WooCommerce API request: ${clientKey} - ${clientData.count}/${this.maxRequests}`,
    );

    next();
  }

  private isWooCommerceEndpoint(path: string): boolean {
    return (
      path.startsWith('/woocommerce') ||
      path.startsWith('/products/sync') ||
      path.includes('woocommerce')
    );
  }

  private getClientKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).user?.id;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${clientIp}`;
  }

  private cleanupExpiredEntries(now: number) {
    const expiredKeys = Object.keys(this.store).filter(
      (key) => now > this.store[key].resetTime + this.windowMs,
    );

    expiredKeys.forEach((key) => {
      delete this.store[key];
    });

    if (expiredKeys.length > 0) {
      this.logger.debug(
        `Cleaned up ${expiredKeys.length} expired rate limit entries`,
      );
    }
  }

  // Method to get current rate limit status for a client
  getRateLimitStatus(req: Request) {
    const clientKey = this.getClientKey(req);
    const clientData = this.store[clientKey];
    const now = Date.now();

    if (!clientData) {
      return {
        limit: this.maxRequests,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
        windowMs: this.windowMs,
      };
    }

    return {
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - clientData.count),
      resetTime: clientData.resetTime,
      windowMs: this.windowMs,
      lastRequest: clientData.lastRequest,
    };
  }
}
