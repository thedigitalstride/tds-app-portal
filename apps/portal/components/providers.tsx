'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ClientProvider } from './client-context';
import { ToastProvider } from './toast-context';
import { FeedbackButton } from './feedback/feedback-button';

function AuthenticatedFeedbackButton() {
  const { status } = useSession();

  // Only show feedback button when authenticated
  if (status !== 'authenticated') {
    return null;
  }

  return <FeedbackButton />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ClientProvider>
        <ToastProvider>
          {children}
          <AuthenticatedFeedbackButton />
        </ToastProvider>
      </ClientProvider>
    </SessionProvider>
  );
}
