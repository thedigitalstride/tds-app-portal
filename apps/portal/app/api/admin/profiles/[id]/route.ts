import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, Profile, UserPermissions } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    await connectDB();
    const profile = await Profile.findById(id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const body = await request.json();

    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ error: 'Profile name must be a non-empty string' }, { status: 400 });
    }

    await connectDB();
    const profile = await Profile.findByIdAndUpdate(
      id,
      {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.toolIds && { toolIds: body.toolIds }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
      { new: true }
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    await connectDB();

    // Check if any users are assigned to this profile
    const usersWithProfile = await UserPermissions.countDocuments({
      profileIds: id,
    });

    if (usersWithProfile > 0) {
      return NextResponse.json(
        { error: `Cannot delete profile: ${usersWithProfile} user(s) assigned` },
        { status: 400 }
      );
    }

    const profile = await Profile.findByIdAndDelete(id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to delete profile:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
