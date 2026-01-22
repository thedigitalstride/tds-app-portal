import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, Client } from '@tds/database';
import {
  requireClientAccess,
  requireAdmin,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    await requireClientAccess(id);

    await connectDB();
    const client = await Client.findById(id);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    await requireAdmin();
    const body = await request.json();

    // Whitelist only editable fields
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
    if (body.contactName !== undefined) updateData.contactName = body.contactName;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await connectDB();
    const client = await Client.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    await requireAdmin();

    await connectDB();

    // Soft delete - set isActive to false
    const client = await Client.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to delete client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
