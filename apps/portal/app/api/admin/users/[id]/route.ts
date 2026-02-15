import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@tds/database';
import { requireAdmin, isSuperAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdmin();

    const { id } = await params;
    await connectDB();

    const user = await User.findById(id).select('_id name email role createdAt');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await requireAdmin();

    const { id } = await params;

    // Prevent changing own role
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const newRole = body.role;

    // Validate role value
    const validRoles = ['super-admin', 'admin', 'user'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role value' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get target user to check their current role
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only super-admin can set role to super-admin
    if (newRole === 'super-admin' && !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Only super admins can promote to super admin' },
        { status: 403 }
      );
    }

    // Only super-admin can modify another super-admin's role
    if (isSuperAdmin(targetUser.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Only super admins can change a super admin\'s role' },
        { status: 403 }
      );
    }

    // Only super-admin can modify an admin's role
    if (targetUser.role === 'admin' && !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Only super admins can change an admin\'s role' },
        { status: 403 }
      );
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role: newRole } },
      { new: true }
    );

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
