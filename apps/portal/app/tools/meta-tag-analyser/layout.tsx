import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessTool } from '@/lib/permissions';
import { Sidebar } from '@/components/sidebar';

const TOOL_ID = 'meta-tag-analyser';

export default async function MetaTagAnalyserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const hasAccess = await canAccessTool(session.user.id, TOOL_ID);

  if (!hasAccess) {
    redirect('/dashboard?error=no-tool-access');
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
