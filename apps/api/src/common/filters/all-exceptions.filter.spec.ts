import { HttpStatus, ArgumentsHost } from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';
import { ProblemDetails } from './problem-details.interface';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockGetRequest: jest.Mock;
  let mockHttpArgumentsHost: jest.Mock;
  let mockArgumentsHost: ArgumentsHost;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    originalNodeEnv = process.env.NODE_ENV;

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = jest.fn().mockReturnValue({
      status: mockStatus,
    });
    mockGetRequest = jest.fn().mockReturnValue({
      url: '/api/test',
      method: 'GET',
      headers: {
        'x-request-id': 'catch-all-test-456',
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

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch Error instances and format according to RFC 7807', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Unexpected error occurred');

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sentinel-rfp.com/errors/internal-error',
        title: 'Internal Server Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: 'Unexpected error occurred',
        instance: '/api/test',
        timestamp: expect.any(String),
        requestId: 'catch-all-test-456',
      } as ProblemDetails),
    );
  });

  it('should catch string exceptions', () => {
    process.env.NODE_ENV = 'development';
    const exception = 'String error message';

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'String error message',
      }),
    );
  });

  it('should catch unknown exception types', () => {
    process.env.NODE_ENV = 'development';
    const exception = { custom: 'error' };

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'An unexpected error occurred',
      }),
    );
  });

  it('should hide error details in production', () => {
    process.env.NODE_ENV = 'production';
    const exception = new Error('Sensitive internal error details');

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        detail:
          'An internal server error occurred. Please contact support if the problem persists.',
      }),
    );
  });

  it('should expose error details in development', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Detailed error message');

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Detailed error message',
      }),
    );
  });

  it('should include stack trace in development', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Error with stack');

    filter.catch(exception, mockArgumentsHost);

    const callArgs = mockJson.mock.calls[0][0] as ProblemDetails;
    expect(callArgs.stack).toBeDefined();
    expect(typeof callArgs.stack).toBe('string');
  });

  it('should NOT include stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const exception = new Error('Error without stack');

    filter.catch(exception, mockArgumentsHost);

    const callArgs = mockJson.mock.calls[0][0] as ProblemDetails;
    expect(callArgs.stack).toBeUndefined();
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

    const exception = new Error('Test error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'unknown',
      }),
    );
  });

  it('should include timestamp in ISO 8601 format', () => {
    const exception = new Error('Test error');

    filter.catch(exception, mockArgumentsHost);

    const callArgs = mockJson.mock.calls[0][0] as ProblemDetails;
    expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should always return 500 status code', () => {
    const exception = new Error('Any error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should handle TypeError', () => {
    process.env.NODE_ENV = 'development';
    const exception = new TypeError('Cannot read property of undefined');

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Cannot read property of undefined',
      }),
    );
  });

  it('should handle ReferenceError', () => {
    process.env.NODE_ENV = 'development';
    const exception = new ReferenceError('Variable is not defined');

    filter.catch(exception, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Variable is not defined',
      }),
    );
  });
});
