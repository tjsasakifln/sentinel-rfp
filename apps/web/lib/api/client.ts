/**
 * Base API client for Sentinel RFP
 *
 * Provides type-safe fetch wrapper with error handling and auth support.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE_PATH = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (fetchOptions.headers) {
    Object.entries(fetchOptions.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${API_BASE_PATH}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorCode: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorCode = errorData.code;
    } catch {
      // If error response is not JSON, use status text
      errorMessage = response.statusText;
    }

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  return response.json();
}

export { apiFetch };
