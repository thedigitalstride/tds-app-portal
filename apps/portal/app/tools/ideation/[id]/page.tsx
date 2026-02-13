'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { IdeaWorkspace } from '../components/IdeaWorkspace';

export default function IdeaWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!session?.user?.id || !id) {
    return null;
  }

  return <IdeaWorkspace ideaId={id} currentUserId={session.user.id} />;
}
