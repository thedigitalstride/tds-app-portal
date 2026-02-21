import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, DataFlow } from '@tds/database';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/tools/data-flow/[id]
 * Load a single flow (full document including nodes/edges).
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await context.params;
    await connectDB();

    const flow = await DataFlow.findById(id).lean();
    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error) {
    console.error('Error loading data flow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/tools/data-flow/[id]
 * Update flow state (auto-save endpoint).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    await connectDB();

    const updateFields: Record<string, unknown> = {
      lastModifiedBy: session.user.id,
    };

    // Only update fields that are present in the body
    if (body.nodes !== undefined) updateFields.nodes = body.nodes;
    if (body.edges !== undefined) updateFields.edges = body.edges;
    if (body.activeTableNodeId !== undefined) updateFields.activeTableNodeId = body.activeTableNodeId;
    if (body.tableCounter !== undefined) updateFields.tableCounter = body.tableCounter;
    if (body.schemaCounter !== undefined) updateFields.schemaCounter = body.schemaCounter;
    if (body.joinCounter !== undefined) updateFields.joinCounter = body.joinCounter;
    if (body.facebookAdCounter !== undefined) updateFields.facebookAdCounter = body.facebookAdCounter;
    if (body.name !== undefined) updateFields.name = body.name.trim();
    if (body.description !== undefined) updateFields.description = body.description;

    const flow = await DataFlow.findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error) {
    console.error('Error updating data flow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tools/data-flow/[id]
 * Delete a flow.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await context.params;
    await connectDB();

    const flow = await DataFlow.findByIdAndDelete(id);
    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting data flow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
