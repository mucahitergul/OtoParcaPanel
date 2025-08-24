import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '';
    const startTime = Date.now();

    // Log request
    this.logger.log(`${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // Override res.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any, cb?: () => void) {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('Content-Length') || 0;

      // Log response
      const logLevel = statusCode >= 400 ? 'error' : 'log';
      const logger = new Logger('HTTP');
      logger[logLevel](
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms - ${ip}`,
      );

      // Call original end method
      return originalEnd(chunk, encoding, cb);
    } as any;

    next();
  }
}
