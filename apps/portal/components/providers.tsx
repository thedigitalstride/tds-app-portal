'use client';

import { SessionProvider } from 'next-auth/react';
import { ClientProvider } from './client-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ClientProvider>{children}</ClientProvider>
    </SessionProvider>
  );
}
