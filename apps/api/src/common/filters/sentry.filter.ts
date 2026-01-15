import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { withScope, captureException } from '@sentry/nestjs';
import { Request } from 'express';

/**
 * Sentry Exception Filter
 *
 * Captures exceptions and sends them to Sentry with contextual information.
 * This filter enriches error events with user context, request data, and tags.
 *
 * @example
 * // In main.ts:
 * app.useGlobalFilters(new SentryFilter());
 */
@Catch()
export class SentryFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const user = (request as any).user; // From JWT auth guard

    // Capture exception with Sentry
    withScope((scope) => {
      // Add user context
      if (user) {
        scope.setUser({
          id: user.userId || user.sub,
          email: user.email,
          username: user.email,
        });
        scope.setTag('organizationId', user.organizationId);
      }

      // Add request context
      scope.setTag('requestId', request.headers['x-request-id'] as string);
      scope.setTag('method', request.method);
      scope.setTag('url', request.url);

      // Add breadcrumb for request
      scope.addBreadcrumb({
        category: 'http',
        message: `${request.method} ${request.url}`,
        level: 'info',
        data: {
          method: request.method,
          url: request.url,
          query: request.query,
          headers: this.sanitizeHeaders(request.headers),
        },
      });

      // Determine error level
      const isHttpException = exception instanceof HttpException;
      const status = isHttpException ? exception.getStatus() : 500;

      // Only capture 5xx errors as exceptions (4xx are user errors)
      if (status >= 500) {
        scope.setLevel('error');
        captureException(exception);
      } else if (status === 401 || status === 403) {
        // Log auth failures with warning level
        scope.setLevel('warning');
        scope.setTag('authFailure', 'true');
        captureException(exception);
      }
    });

    // Don't handle the exception - let other filters do that
    // This filter only captures for Sentry
  }

  /**
   * Sanitize sensitive headers before sending to Sentry
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    sensitiveKeys.forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
