import type { Metadata } from 'next';

import { ErrorBoundary } from '@/components/error-boundary';
import { Layout } from '@/components/layout/layout';
import { QueryProvider } from '@/providers/query-provider';

import { ClientSentry } from './_client-sentry';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sentinel RFP',
  description: 'AI-powered RFP response platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientSentry />
        <ErrorBoundary>
          <QueryProvider>
            <Layout>{children}</Layout>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
