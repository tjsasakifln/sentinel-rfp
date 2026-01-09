'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { makeQueryClient } from '@/lib/query-client';
import { useState } from 'react';

/**
 * QueryProvider component that wraps the application with React Query context.
 *
 * Features:
 * - Provides QueryClient to all child components
 * - Includes DevTools in development mode for debugging
 * - Creates a single QueryClient instance per component tree
 *
 * @param props.children - Child components to wrap with QueryProvider
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a single QueryClient instance for this component tree
  // This ensures stable reference and prevents recreating on every render
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools - only visible in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
