import { NextResponse } from 'next/server';
import { connectDB, User } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    await connectDB();
    const users = await User.find().sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
