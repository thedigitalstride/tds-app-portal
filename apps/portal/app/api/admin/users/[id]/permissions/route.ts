import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, UserPermissions, Profile, User } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError, getAccessibleTools, isSuperAdmin, isAtLeastAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();

    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create user permissions (atomic upsert to avoid race conditions)
    const permissions = await UserPermissions.findOneAndUpdate(
      { userId },
      { $setOnInsert: { profileIds: [], grantedTools: [], revokedTools: [] } },
      { new: true, upsert: true }
    );

    // Get assigned profiles
    const profiles = await Profile.find({ _id: { $in: permissions.profileIds } });

    // Get effective tool access
    const accessibleTools = await getAccessibleTools(userId);

    return NextResponse.json({
      permissions,
      profiles,
      accessibleTools,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch user permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch user permissions' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id: userId } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Prevent modifying own permissions
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot modify your own permissions' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Non-super-admin cannot modify admin or super-admin permissions
    if (isAtLeastAdmin(userExists.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Only super admins can modify admin permissions' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.profileIds !== undefined) {
      if (!Array.isArray(body.profileIds)) {
        return NextResponse.json({ error: 'profileIds must be an array' }, { status: 400 });
      }
      if (!body.profileIds.every((id: string) => mongoose.Types.ObjectId.isValid(id))) {
        return NextResponse.json({ error: 'Invalid profile ID in profileIds' }, { status: 400 });
      }
      updateData.profileIds = body.profileIds;
    }

    if (body.grantedTools !== undefined) {
      if (!Array.isArray(body.grantedTools)) {
        return NextResponse.json({ error: 'grantedTools must be an array' }, { status: 400 });
      }
      updateData.grantedTools = body.grantedTools;
    }

    if (body.revokedTools !== undefined) {
      if (!Array.isArray(body.revokedTools)) {
        return NextResponse.json({ error: 'revokedTools must be an array' }, { status: 400 });
      }
      updateData.revokedTools = body.revokedTools;
    }

    const permissions = await UserPermissions.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true }
    );

    // Get updated effective tool access
    const accessibleTools = await getAccessibleTools(userId);

    return NextResponse.json({
      permissions,
      accessibleTools,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update user permissions:', error);
    return NextResponse.json({ error: 'Failed to update user permissions' }, { status: 500 });
  }
}
