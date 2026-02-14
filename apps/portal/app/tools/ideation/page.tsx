'use client';

import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { IdeaPipeline } from './components/IdeaPipeline';

export default function IdeationPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className="p-6 lg:p-8">
      <IdeaPipeline currentUserId={session.user.id} />
    </div>
  );
}
