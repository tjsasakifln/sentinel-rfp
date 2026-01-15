/**
 * Next.js Instrumentation File
 *
 * This file runs once when the server starts (or on first client load).
 * Perfect place to initialize Sentry and other monitoring tools.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Server-side initialization
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('./lib/sentry');
    initSentry();
  }

  // Edge runtime initialization
  if (process.env.NEXT_RUNTIME === 'edge') {
    const { initSentry } = await import('./lib/sentry');
    initSentry();
  }
}
