import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetails } from './problem-details.interface';

/**
 * Global exception filter for HttpException instances.
 * Formats errors according to RFC 7807 Problem Details.
 * @see https://tools.ietf.org/html/rfc7807
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract message and additional details
    let detail: string;
    let additionalFields: Record<string, unknown> = {};

    if (typeof exceptionResponse === 'string') {
      detail = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      detail = (responseObj.message as string) || exception.message;

      // Include validation errors if present
      if (responseObj.errors) {
        additionalFields.errors = responseObj.errors;
      }
    } else {
      detail = exception.message;
    }

    // Get requestId from request headers (will be set by RequestIdInterceptor)
    const requestId = (request.headers['x-request-id'] as string) || 'unknown';

    // Build RFC 7807 Problem Details response
    const problemDetails: ProblemDetails = {
      type: this.getErrorTypeUri(status),
      title: this.getHttpStatusText(status),
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      requestId,
      ...additionalFields,
    };

    // Log based on severity
    if (status >= 500) {
      this.logger.error(
        {
          requestId,
          method: request.method,
          url: request.url,
          status,
          error: exception.message,
          stack: exception.stack,
        },
        'HttpException caught',
      );
    } else if (status >= 400) {
      this.logger.warn(
        {
          requestId,
          method: request.method,
          url: request.url,
          status,
          detail,
        },
        'Client error',
      );
    }

    response.status(status).json(problemDetails);
  }

  /**
   * Generate error type URI based on status code
   */
  private getErrorTypeUri(status: number): string {
    const baseUri = 'https://sentinel-rfp.com/errors';

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return `${baseUri}/bad-request`;
      case HttpStatus.UNAUTHORIZED:
        return `${baseUri}/unauthorized`;
      case HttpStatus.FORBIDDEN:
        return `${baseUri}/forbidden`;
      case HttpStatus.NOT_FOUND:
        return `${baseUri}/not-found`;
      case HttpStatus.CONFLICT:
        return `${baseUri}/conflict`;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return `${baseUri}/validation-error`;
      case HttpStatus.TOO_MANY_REQUESTS:
        return `${baseUri}/rate-limit-exceeded`;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return `${baseUri}/internal-error`;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return `${baseUri}/service-unavailable`;
      default:
        return `${baseUri}/http-${status}`;
    }
  }

  /**
   * Get human-readable HTTP status text
   */
  private getHttpStatusText(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Validation Error';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      default:
        return `HTTP ${status}`;
    }
  }
}
