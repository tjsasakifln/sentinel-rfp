'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertCircle } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary Component
 *
 * Catches React component errors and reports them to Sentry.
 * Displays a fallback UI when an error occurs.
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Report to Sentry with component stack
    Sentry.withScope((scope) => {
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
      });
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-red-100 p-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h2>

          <p className="text-gray-600 mb-1 max-w-md">
            We&apos;ve been notified and are looking into the issue.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error details (dev only)
              </summary>
              <pre className="mt-2 max-w-2xl overflow-auto rounded bg-gray-100 p-4 text-xs text-gray-800">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={this.handleReset} variant="outline">
              Try again
            </Button>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
