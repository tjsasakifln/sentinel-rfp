import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { ProblemDetails } from './problem-details.interface';

/**
 * Exception filter for Prisma ORM errors.
 * Converts Prisma errors into user-friendly RFC 7807 Problem Details responses.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || 'unknown';

    let status: number;
    let title: string;
    let detail: string;
    let type: string;
    const baseUri = 'https://sentinel-rfp.com/errors';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors with specific codes
      const prismaError = this.handleKnownError(exception);
      status = prismaError.status;
      title = prismaError.title;
      detail = prismaError.detail;
      type = prismaError.type;

      // Log error
      this.logger.warn(
        {
          requestId,
          method: request.method,
          url: request.url,
          prismaCode: exception.code,
          meta: exception.meta,
        },
        'Prisma known error',
      );
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      title = 'Database Error';
      detail = 'An unknown database error occurred';
      type = `${baseUri}/database-error`;

      this.logger.error(
        {
          requestId,
          method: request.method,
          url: request.url,
          error: exception.message,
        },
        'Prisma unknown error',
      );
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      title = 'Validation Error';
      detail = 'Invalid data provided to database query';
      type = `${baseUri}/validation-error`;

      this.logger.warn(
        {
          requestId,
          method: request.method,
          url: request.url,
        },
        'Prisma validation error',
      );
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      title = 'Database Unavailable';
      detail = 'Database connection could not be established';
      type = `${baseUri}/database-unavailable`;

      this.logger.error(
        {
          requestId,
          method: request.method,
          url: request.url,
          error: exception.message,
        },
        'Prisma initialization error',
      );
    } else {
      // Fallback for unexpected error types
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      title = 'Internal Server Error';
      detail = 'An unexpected error occurred';
      type = `${baseUri}/internal-error`;

      this.logger.error(
        {
          requestId,
          method: request.method,
          url: request.url,
          error: String(exception),
        },
        'Unexpected Prisma error type',
      );
    }

    const problemDetails: ProblemDetails = {
      type,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    };

    response.status(status).json(problemDetails);
  }

  /**
   * Handle known Prisma error codes
   * @see https://www.prisma.io/docs/reference/api-reference/error-reference
   */
  private handleKnownError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    title: string;
    detail: string;
    type: string;
  } {
    const baseUri = 'https://sentinel-rfp.com/errors';

    switch (exception.code) {
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Value Too Long',
          detail: 'The provided value is too long for the column',
          type: `${baseUri}/value-too-long`,
        };

      case 'P2001':
        return {
          status: HttpStatus.NOT_FOUND,
          title: 'Record Not Found',
          detail: 'The requested record does not exist',
          type: `${baseUri}/not-found`,
        };

      case 'P2002': {
        // Unique constraint violation
        const target = exception.meta?.target as string[] | undefined;
        const fields = target ? target.join(', ') : 'field';
        return {
          status: HttpStatus.CONFLICT,
          title: 'Unique Constraint Violation',
          detail: `A record with this ${fields} already exists`,
          type: `${baseUri}/duplicate-record`,
        };
      }

      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Foreign Key Constraint Failed',
          detail: 'The referenced record does not exist',
          type: `${baseUri}/invalid-reference`,
        };

      case 'P2004':
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Constraint Failed',
          detail: 'A database constraint was violated',
          type: `${baseUri}/constraint-violation`,
        };

      case 'P2011':
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Null Constraint Violation',
          detail: 'A required field is missing',
          type: `${baseUri}/null-constraint`,
        };

      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Invalid Relation',
          detail: 'The change would violate a required relation',
          type: `${baseUri}/invalid-relation`,
        };

      case 'P2015':
        return {
          status: HttpStatus.NOT_FOUND,
          title: 'Related Record Not Found',
          detail: 'The related record was not found',
          type: `${baseUri}/related-not-found`,
        };

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          title: 'Record Not Found',
          detail: 'Could not find the record to update or delete',
          type: `${baseUri}/not-found`,
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          title: 'Database Error',
          detail: `Database error occurred (code: ${exception.code})`,
          type: `${baseUri}/database-error`,
        };
    }
  }
}
