import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getAccessibleTools, getAccessibleAdminPages } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [tools, adminPages] = await Promise.all([
      getAccessibleTools(session.user.id),
      getAccessibleAdminPages(session.user.id),
    ]);

    return NextResponse.json({
      tools,
      adminPages,
      role: session.user.role,
    });
  } catch (error) {
    console.error('Failed to fetch user access:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user access' },
      { status: 500 }
    );
  }
}
