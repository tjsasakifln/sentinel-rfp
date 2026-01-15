'use client';

import { useEffect } from 'react';

import { initSentry } from '@/lib/sentry';

/**
 * Client-side Sentry initialization
 *
 * This component ensures Sentry is initialized on the client side.
 * It should be included in the root layout.
 */
export function ClientSentry() {
  useEffect(() => {
    initSentry();
  }, []);

  return null;
}
