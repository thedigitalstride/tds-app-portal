'use client';

import { SessionProvider } from 'next-auth/react';
import { ClientProvider } from './client-context';
import { ToastProvider } from './toast-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ClientProvider>
        <ToastProvider>{children}</ToastProvider>
      </ClientProvider>
    </SessionProvider>
  );
}
