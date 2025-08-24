import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  duration?: number;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const duration = Date.now() - startTime;

        // If data is already in the expected format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            duration,
          };
        }

        // Otherwise, wrap the data in the standard format
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          statusCode: response.statusCode,
          duration,
        };
      }),
      tap((response) => {
        // Log successful requests
        this.logger.log(
          `${request.method} ${request.url} - ${response.statusCode} - ${response.duration}ms`,
        );
      }),
    );
  }
}
