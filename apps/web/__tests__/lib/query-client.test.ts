import { makeQueryClient } from '@/lib/query-client';

describe('makeQueryClient', () => {
  it('creates a QueryClient instance', () => {
    const client = makeQueryClient();
    expect(client).toBeDefined();
    expect(typeof client.getQueryCache).toBe('function');
    expect(typeof client.getMutationCache).toBe('function');
  });

  it('configures default query options correctly', () => {
    const client = makeQueryClient();
    const defaultOptions = client.getDefaultOptions();

    // Check staleTime (5 minutes = 300000ms)
    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);

    // Check retry count
    expect(defaultOptions.queries?.retry).toBe(2);

    // Check refetchOnWindowFocus
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('creates a new instance on each call', () => {
    const client1 = makeQueryClient();
    const client2 = makeQueryClient();

    // Should be different instances
    expect(client1).not.toBe(client2);
  });
});
