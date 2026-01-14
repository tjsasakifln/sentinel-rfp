import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';
import { ProblemDetails } from './problem-details.interface';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockGetRequest: jest.Mock;
  let mockHttpArgumentsHost: jest.Mock;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = jest.fn().mockReturnValue({
      status: mockStatus,
    });
    mockGetRequest = jest.fn().mockReturnValue({
      url: '/api/test',
      method: 'GET',
      headers: {
        'x-request-id': 'test-request-id-123',
      },
    });
    mockHttpArgumentsHost = jest.fn().mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });

    mockArgumentsHost = {
      switchToHttp: mockHttpArgumentsHost,
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should format HttpException with string message according to RFC 7807', () => {
    const exception = new HttpException('Test error message', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/bad-request',
        title: 'Bad Request',
        status: HttpStatus.BAD_REQUEST,
        detail: 'Test error message',
        instance: '/api/test',
        timestamp: expect.any(String),
        requestId: 'test-request-id-123',
      } as ProblemDetails),
    );
  });

  it('should format HttpException with object response', () => {
    const exception = new HttpException(
      {
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Invalid email' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/validation-error',
        title: 'Validation Error',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'Validation failed',
        errors: [{ field: 'email', message: 'Invalid email' }],
        requestId: 'test-request-id-123',
      }),
    );
  });

  it('should handle 401 Unauthorized', () => {
    const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/unauthorized',
        title: 'Unauthorized',
        status: HttpStatus.UNAUTHORIZED,
      }),
    );
  });

  it('should handle 403 Forbidden', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/forbidden',
        title: 'Forbidden',
        status: HttpStatus.FORBIDDEN,
      }),
    );
  });

  it('should handle 404 Not Found', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/not-found',
        title: 'Not Found',
        status: HttpStatus.NOT_FOUND,
      }),
    );
  });

  it('should handle 409 Conflict', () => {
    const exception = new HttpException('Conflict', HttpStatus.CONFLICT);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/conflict',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
      }),
    );
  });

  it('should handle 429 Too Many Requests', () => {
    const exception = new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: HttpStatus.TOO_MANY_REQUESTS,
      }),
    );
  });

  it('should handle 500 Internal Server Error', () => {
    const exception = new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/internal-error',
        title: 'Internal Server Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    );
  });

  it('should handle 503 Service Unavailable', () => {
    const exception = new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/service-unavailable',
        title: 'Service Unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      }),
    );
  });

  it('should default to unknown requestId when header is missing', () => {
    mockGetRequest = jest.fn().mockReturnValue({
      url: '/api/test',
      method: 'GET',
      headers: {},
    });
    mockHttpArgumentsHost = jest.fn().mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });
    mockArgumentsHost.switchToHttp = mockHttpArgumentsHost;

    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'unknown',
      }),
    );
  });

  it('should generate default error type URI for unmapped status codes', () => {
    const exception = new HttpException('Teapot error', HttpStatus.I_AM_A_TEAPOT);

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/http-418',
        title: 'HTTP 418',
        status: HttpStatus.I_AM_A_TEAPOT,
      }),
    );
  });

  it('should include timestamp in ISO 8601 format', () => {
    const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    const callArgs = mockJson.mock.calls[0][0] as ProblemDetails;
    expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
