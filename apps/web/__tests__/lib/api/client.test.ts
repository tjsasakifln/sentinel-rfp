import { apiFetch, ApiError } from '@/lib/api/client';

// Mock fetch globally
global.fetch = jest.fn();

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes successful GET request', async () => {
    const mockData = { id: 1, name: 'Test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiFetch('/test');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/test',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('includes Authorization header when token is provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/test', { token: 'test-token' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/test',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      }),
    );
  });

  it('throws ApiError on failed request with JSON error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        message: 'Not Found',
        code: 'NOT_FOUND',
      }),
    });

    await expect(apiFetch('/test')).rejects.toThrow(ApiError);

    // Reset mock for second call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        message: 'Not Found',
        code: 'NOT_FOUND',
      }),
    });

    await expect(apiFetch('/test')).rejects.toMatchObject({
      message: 'Not Found',
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws ApiError on failed request with non-JSON error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(apiFetch('/test')).rejects.toThrow(ApiError);

    // Reset mock for second call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(apiFetch('/test')).rejects.toMatchObject({
      message: 'Internal Server Error',
      status: 500,
    });
  });

  it('handles 401 Unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      }),
    });

    await expect(apiFetch('/protected')).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    });
  });

  it('passes through custom headers', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/test', {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/test',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      }),
    );
  });
});

describe('ApiError', () => {
  it('creates error with message, status, and code', () => {
    const error = new ApiError('Test error', 400, 'TEST_ERROR');

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('ApiError');
  });

  it('creates error without code', () => {
    const error = new ApiError('Test error', 500);

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
  });
});
