import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { BaseException, ErrorCode } from '../exceptions';

/**
 * Standard error response structure
 */
interface ErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string | string[];
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  method: string;
}

/**
 * Global exception filter that handles all exceptions
 * and returns a consistent error response format
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error for debugging (only log stack for 500 errors)
    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${errorResponse.errorCode}: ${errorResponse.message}`,
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Handle our custom BaseException
    if (exception instanceof BaseException) {
      return {
        statusCode: exception.getStatus(),
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details,
        timestamp,
        path,
        method,
      };
    }

    // Handle Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path, method);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid data provided',
        details: { prismaError: exception.message.split('\n').pop() },
        timestamp,
        path,
        method,
      };
    }

    // Handle validation errors (class-validator via ValidationPipe)
    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse() as Record<
        string,
        unknown
      >;

      if (
        exceptionResponse.message &&
        Array.isArray(exceptionResponse.message)
      ) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_ERROR,
          message: exceptionResponse.message,
          timestamp,
          path,
          method,
        };
      }
    }

    // Handle standard HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let message: string | string[];
      let errorCode = this.getErrorCodeFromStatus(status);

      if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | string[]) || exception.message;
        if (resp.errorCode) {
          errorCode = resp.errorCode as string;
        }
      } else {
        message = exceptionResponse;
      }

      return {
        statusCode: status,
        errorCode,
        message,
        timestamp,
        path,
        method,
      };
    }

    // Handle unknown errors
    const message =
      exception instanceof Error
        ? exception.message
        : 'An unexpected error occurred';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message,
      timestamp,
      path,
      method,
    };
  }

  /**
   * Handle Prisma-specific errors and convert to user-friendly messages
   */
  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    switch (error.code) {
      // Unique constraint violation
      case 'P2002': {
        const target = (error.meta?.target as string[]) || ['field'];
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: ErrorCode.DB_UNIQUE_CONSTRAINT,
          message: `A record with this ${target.join(', ')} already exists`,
          details: { fields: target },
          timestamp,
          path,
          method,
        };
      }

      // Foreign key constraint violation
      case 'P2003': {
        const field = error.meta?.field_name as string;
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.DB_FOREIGN_KEY_CONSTRAINT,
          message: `Referenced record does not exist`,
          details: { field },
          timestamp,
          path,
          method,
        };
      }

      // Record not found
      case 'P2025': {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: ErrorCode.DB_RECORD_NOT_FOUND,
          message: (error.meta?.cause as string) || 'Record not found',
          timestamp,
          path,
          method,
        };
      }

      // Required field missing
      case 'P2011': {
        const field = error.meta?.constraint as string;
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_ERROR,
          message: `Required field '${field}' is missing`,
          details: { field },
          timestamp,
          path,
          method,
        };
      }

      // Invalid value for field type
      case 'P2006': {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid value provided for field',
          details: { meta: error.meta },
          timestamp,
          path,
          method,
        };
      }

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode: ErrorCode.INTERNAL_ERROR,
          message: 'A database error occurred',
          details: { code: error.code },
          timestamp,
          path,
          method,
        };
    }
  }

  /**
   * Map HTTP status codes to error codes
   */
  private getErrorCodeFromStatus(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
