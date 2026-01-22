import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, ClientAssignment, Client, User } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

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

    const assignments = await ClientAssignment.find({ userId }).populate('clientId');
    const clients = assignments
      .filter(a => a.clientId)
      .map(a => a.clientId);

    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch client assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch client assignments' }, { status: 500 });
  }
}

export async function POST(
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

    if (!body.clientId || !mongoose.Types.ObjectId.isValid(body.clientId)) {
      return NextResponse.json({ error: 'Valid clientId is required' }, { status: 400 });
    }

    await connectDB();

    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify client exists
    const client = await Client.findById(body.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    if (!client.isActive) {
      return NextResponse.json({ error: 'Cannot assign inactive client' }, { status: 400 });
    }

    // Create assignment (will fail if duplicate due to unique index)
    try {
      await ClientAssignment.create({
        userId,
        clientId: body.clientId,
        assignedBy: session.user.id,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
        return NextResponse.json({ error: 'Client already assigned' }, { status: 400 });
      }
      throw err;
    }

    // Return updated list
    const assignments = await ClientAssignment.find({ userId }).populate('clientId');
    const clients = assignments
      .filter(a => a.clientId)
      .map(a => a.clientId);

    return NextResponse.json(clients, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to assign client:', error);
    return NextResponse.json({ error: 'Failed to assign client' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    await connectDB();

    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deleted = await ClientAssignment.findOneAndDelete({ userId, clientId });
    if (!deleted) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Return updated list
    const assignments = await ClientAssignment.find({ userId }).populate('clientId');
    const clients = assignments
      .filter(a => a.clientId)
      .map(a => a.clientId);

    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to unassign client:', error);
    return NextResponse.json({ error: 'Failed to unassign client' }, { status: 500 });
  }
}
