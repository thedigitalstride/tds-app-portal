import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Profile } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const profiles = await Profile.find().sort({ name: 1 });
    return NextResponse.json(profiles);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    await connectDB();

    try {
      const profile = await Profile.create({
        name: body.name,
        description: body.description || '',
        toolIds: body.toolIds || [],
        isDefault: body.isDefault || false,
        createdBy: session.user.id,
      });

      return NextResponse.json(profile, { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
        return NextResponse.json({ error: 'Profile name already exists' }, { status: 400 });
      }
      throw err;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to create profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
