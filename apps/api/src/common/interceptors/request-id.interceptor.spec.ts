import { RequestIdInterceptor } from './request-id.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Request, Response } from 'express';

// Mock uuid module to avoid ESM compatibility issues with Jest
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4-string'),
}));

describe('RequestIdInterceptor', () => {
  let interceptor: RequestIdInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    interceptor = new RequestIdInterceptor();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    };
  });

  describe('intercept', () => {
    it('should generate UUID v4 when X-Request-ID header is not provided', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect((mockRequest as any).id).toBeDefined();
      expect((mockRequest as any).id).toBe('mocked-uuid-v4-string');
    });

    it('should use client-provided X-Request-ID if present', () => {
      const clientRequestId = 'client-provided-uuid-123';
      mockRequest.headers = { 'x-request-id': clientRequestId };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect((mockRequest as any).id).toBe(clientRequestId);
    });

    it('should set X-Request-ID response header', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String),
      );
    });

    it('should set response header to match request.id', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);

      const requestId = (mockRequest as any).id;
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        requestId,
      );
    });

    it('should call next.handle()', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should return observable from next.handle()', () => {
      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBe(mockCallHandler.handle());
    });

    it('should support idempotency with same client request ID', () => {
      const clientRequestId = 'idempotent-request-123';
      mockRequest.headers = { 'x-request-id': clientRequestId };

      interceptor.intercept(mockExecutionContext, mockCallHandler);
      const firstRequestId = (mockRequest as any).id;

      // Reset mocks
      mockRequest = { headers: { 'x-request-id': clientRequestId } };
      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as any;

      interceptor.intercept(mockExecutionContext, mockCallHandler);
      const secondRequestId = (mockRequest as any).id;

      expect(firstRequestId).toBe(secondRequestId);
      expect(firstRequestId).toBe(clientRequestId);
    });

    it('should call uuid generator for requests without X-Request-ID', () => {
      const { v4: uuidv4 } = require('uuid');

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(uuidv4).toHaveBeenCalled();
    });
  });
});
