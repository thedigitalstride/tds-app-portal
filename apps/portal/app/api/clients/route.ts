import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Client } from '@tds/database';
import {
  requireAuth,
  requireAdmin,
  getAccessibleClients,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();

    await connectDB();
    const clients = await getAccessibleClients(session.user.id);

    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    await connectDB();

    const client = await Client.create({
      ...body,
      createdBy: session.user.id,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to create client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
