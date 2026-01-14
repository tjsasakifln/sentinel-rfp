import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

import { ProblemDetails } from './problem-details.interface';

/**
 * Catch-all exception filter for unhandled errors.
 * This is the fallback filter that catches any exceptions not handled by more specific filters.
 * For security, 5xx errors hide internal details from the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || 'unknown';
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const baseUri = 'https://sentinel-rfp.com/errors';

    // Extract error information safely
    let errorMessage = 'An unexpected error occurred';
    let stack: string | undefined;

    if (exception instanceof Error) {
      errorMessage = exception.message;
      stack = exception.stack;
    } else if (typeof exception === 'string') {
      errorMessage = exception;
    }

    // Log the full error details
    this.logger.error(
      {
        requestId,
        method: request.method,
        url: request.url,
        error: errorMessage,
        stack,
        type: exception?.constructor?.name,
      },
      'Unhandled exception caught',
    );

    // Build RFC 7807 Problem Details response
    // For security, don't expose internal error details in production
    const problemDetails: ProblemDetails = {
      type: `${baseUri}/internal-error`,
      title: 'Internal Server Error',
      status,
      detail:
        process.env.NODE_ENV === 'production'
          ? 'An internal server error occurred. Please contact support if the problem persists.'
          : errorMessage,
      instance: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    };

    // Include stack trace only in development
    if (process.env.NODE_ENV !== 'production' && stack) {
      problemDetails.stack = stack;
    }

    response.status(status).json(problemDetails);
  }
}
