import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Request, Response } from 'express';
import { of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { RequestIdInterceptor } from './request-id.interceptor';

// Mock uuid module to avoid ESM compatibility issues with Jest
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4-string'),
}));

// Extend Request to override id property added by interceptor
interface RequestWithId extends Omit<Request, 'id'> {
  id: string;
}

describe('RequestIdInterceptor', () => {
  let interceptor: RequestIdInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<RequestWithId>;
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
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    };
  });

  describe('intercept', () => {
    it('should generate UUID v4 when X-Request-ID header is not provided', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.id).toBeDefined();
      expect(mockRequest.id).toBe('mocked-uuid-v4-string');
    });

    it('should use client-provided X-Request-ID if present', () => {
      const clientRequestId = 'client-provided-uuid-123';
      mockRequest.headers = { 'x-request-id': clientRequestId };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.id).toBe(clientRequestId);
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

      const requestId = mockRequest.id;
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
      const firstRequestId = mockRequest.id;

      // Reset mocks
      mockRequest = { headers: { 'x-request-id': clientRequestId } };
      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      interceptor.intercept(mockExecutionContext, mockCallHandler);
      const secondRequestId = mockRequest.id;

      expect(firstRequestId).toBe(secondRequestId);
      expect(firstRequestId).toBe(clientRequestId);
    });

    it('should call uuid generator for requests without X-Request-ID', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(uuidv4).toHaveBeenCalled();
    });
  });
});
