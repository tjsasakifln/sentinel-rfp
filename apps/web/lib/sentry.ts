import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * This should be called in both client and server entry points.
 * For Next.js, it's automatically imported via instrumentation.ts
 */
export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Silently skip Sentry initialization if DSN is not configured
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    enabled: process.env.NODE_ENV !== 'test',

    // Performance Monitoring
    tracesSampleRate: parseFloat(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1',
    ),

    // Filtering
    ignoreErrors: [
      // Browser extensions
      /chrome-extension/,
      /moz-extension/,
      // Network errors
      'Network request failed',
      'NetworkError',
      // AbortController (user canceled requests)
      'AbortError',
    ],

    beforeSend(event, hint) {
      // Don't send events without a valid error
      if (!hint.originalException && !hint.syntheticException) {
        return null;
      }

      return event;
    },
  });
}

/**
 * Set user context for Sentry events
 *
 * Call this after user authentication to enrich error reports
 *
 * @example
 * setUser({
 *   id: user.id,
 *   email: user.email,
 *   organizationId: user.organizationId,
 * });
 */
export function setUser(user: {
  id: string;
  email?: string;
  organizationId?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
  });

  if (user.organizationId) {
    Sentry.setTag('organizationId', user.organizationId);
  }
}

/**
 * Clear user context from Sentry
 *
 * Call this on logout
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Manually capture an exception
 *
 * @example
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   captureException(error, { tags: { feature: 'proposals' } });
 *   showErrorToast();
 * }
 */
export function captureException(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    level?: Sentry.SeverityLevel;
  },
) {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Add a breadcrumb for debugging context
 *
 * @example
 * addBreadcrumb({
 *   message: 'User clicked submit button',
 *   category: 'ui',
 *   data: { proposalId: '123' },
 * });
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}) {
  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'app',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}
