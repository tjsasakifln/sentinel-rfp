import { randomUUID } from 'crypto';

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Logger Module - Structured Logging with Pino
 *
 * This module provides structured JSON logging for production and pretty-printed logs for development.
 *
 * Features:
 * - JSON logs in production (NODE_ENV=production)
 * - Pretty-printed colored logs in development
 * - Automatic request ID tracking
 * - Configurable log levels via LOG_LEVEL env variable
 * - Custom serializers for request/response objects
 *
 * Usage in Services/Controllers:
 * ```typescript
 * import { Logger } from 'nestjs-pino';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly logger: Logger) {}
 *
 *   myMethod() {
 *     this.logger.log('Info message');
 *     this.logger.error('Error message', trace);
 *     this.logger.warn('Warning message');
 *     this.logger.debug('Debug message');
 *   }
 * }
 * ```
 *
 * Log Levels (from highest to lowest priority):
 * - fatal: Application crashes
 * - error: Errors that need attention
 * - warn: Warnings that might need attention
 * - info: General informational messages (default)
 * - debug: Detailed debugging information
 * - trace: Very detailed debugging information
 *
 * Environment Variables:
 * - LOG_LEVEL: Set log level (default: 'info')
 * - NODE_ENV: Controls log format ('production' = JSON, other = pretty)
 *
 * @see https://github.com/iamolegga/nestjs-pino
 * @see https://getpino.io/
 */
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',

        // Pretty printing in development, JSON in production
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                  singleLine: false,
                },
              }
            : undefined,

        // Use request ID from RequestIdInterceptor
        // The interceptor sets req.id before this is called
        genReqId: (req) => {
          return req.id ?? req.headers['x-request-id'] ?? randomUUID();
        },

        // Add custom properties to all logs
        customProps: (req) => ({
          context: 'HTTP',
          requestId: req.id,
        }),

        // Custom serializers for request/response objects
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            headers: {
              host: req.headers.host,
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
            },
            remoteAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
          }),
          res: (res) => ({
            statusCode: res.statusCode,
            headers: {
              'content-type': res.getHeader ? res.getHeader('content-type') : undefined,
              'x-request-id': res.getHeader ? res.getHeader('x-request-id') : undefined,
            },
          }),
          err: (err) => ({
            type: err.type,
            message: err.message,
            stack: err.stack,
            name: err.name,
          }),
        },

        // Automatically log all requests
        autoLogging: true,

        // Custom log messages
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
          } else if (res.statusCode >= 500 || err) {
            return 'error';
          } else if (res.statusCode >= 300 && res.statusCode < 400) {
            return 'silent';
          }
          return 'info';
        },

        // Custom success message
        customSuccessMessage: (req, res) => {
          if (res.statusCode === 404) {
            return `[${req.method}] ${req.url} - Not Found`;
          }
          return `[${req.method}] ${req.url}`;
        },

        // Custom error message
        customErrorMessage: (req, _res, err) => {
          return `[${req.method}] ${req.url} - ${err.message}`;
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
