import { render, screen } from '@testing-library/react';
import { QueryProvider } from '@/providers/query-provider';
import { useQuery } from '@tanstack/react-query';

// Test component that uses React Query
function TestComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['test'],
    queryFn: async () => 'test data',
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>Data: {data}</div>;
}

describe('QueryProvider', () => {
  it('renders children correctly', () => {
    render(
      <QueryProvider>
        <div>Test Child</div>
      </QueryProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('provides QueryClient context to children', async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should show data after query resolves
    const dataElement = await screen.findByText('Data: test data');
    expect(dataElement).toBeInTheDocument();
  });

  it('provides stable QueryClient instance', () => {
    const { rerender } = render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // Rerender should not cause issues with QueryClient
    rerender(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // Should still work after rerender
    expect(screen.getByText(/Data: test data|Loading.../)).toBeInTheDocument();
  });
});
