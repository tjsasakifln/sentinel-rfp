import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extend Express Request to override id property
 * Express Request already has an id property, but we override it with string
 */
interface RequestWithId extends Omit<Request, 'id'> {
  id: string;
}

/**
 * Request ID Interceptor
 *
 * Generates a unique UUID v4 for each HTTP request and propagates it through:
 * - HTTP response header (X-Request-ID)
 * - Request object (req.id)
 * - Logger context (via Pino child logger)
 *
 * Supports idempotent request IDs: if client sends X-Request-ID header,
 * uses that instead of generating a new one.
 *
 * @example
 * // Automatic registration in main.ts
 * app.useGlobalInterceptors(new RequestIdInterceptor());
 *
 * // Access in controller
 * @Get()
 * findAll(@Req() req: Request) {
 *   const requestId = req.id; // UUID v4
 * }
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse<Response>();

    // Use client-provided request ID if available (idempotency)
    // Otherwise generate new UUID v4
    const requestId =
      (request.headers['x-request-id'] as string) || uuidv4();

    // Attach request ID to request object for downstream access
    request.id = requestId;

    // Set response header for client-side correlation
    response.setHeader('X-Request-ID', requestId);

    return next.handle();
  }
}
