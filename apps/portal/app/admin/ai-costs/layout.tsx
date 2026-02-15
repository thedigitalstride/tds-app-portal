import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { isAtLeastAdmin, isSuperAdmin, canAccessAdminPage } from '@/lib/permissions';
import { Sidebar } from '@/components/sidebar';

const ADMIN_PAGE_ID = 'admin:ai-costs';

export default async function AiCostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  if (!isAtLeastAdmin(session.user.role)) {
    redirect('/dashboard');
  }

  if (!isSuperAdmin(session.user.role)) {
    const hasAccess = await canAccessAdminPage(session.user.id, ADMIN_PAGE_ID);
    if (!hasAccess) redirect('/dashboard?error=no-access');
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
