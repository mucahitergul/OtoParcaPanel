import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        details = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      details = {
        name: exception.name,
        stack:
          process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    // Log the error
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      message,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      body: request.body,
      query: request.query,
      params: request.params,
    };

    if (status >= 500) {
      this.logger.error('Server Error:', errorLog);
    } else if (status >= 400) {
      this.logger.warn('Client Error:', errorLog);
    }

    // Prepare response
    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          stack: exception instanceof Error ? exception.stack : undefined,
          body: request.body,
          query: request.query,
          params: request.params,
        },
      }),
    };

    response.status(status).json(errorResponse);
  }
}
