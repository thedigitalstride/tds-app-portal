import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, DataFlow } from '@tds/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/data-flow?clientId=X
 * List all flows for a client (lean — no full node/edge data).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    const flows = await DataFlow.find({ clientId })
      .select('_id name description updatedAt lastModifiedBy')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(flows);
  } catch (error) {
    console.error('Error listing data flows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tools/data-flow
 * Create a new flow with sample data.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { clientId, name } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    await connectDB();

    // Import sample data builder (lazy — keeps route lean)
    const {
      buildNodesAndEdges,
      sampleRows,
      sampleTableNode,
      sampleTableEdges,
      sampleFacebookAdNode,
      sampleFacebookTableNode,
      sampleSchemaNode,
      sampleSchemaEdges,
    } = await import('@/app/tools/data-flow/components/sample-data');

    const { nodes: dataNodes, edges: dataEdges } = buildNodesAndEdges(sampleRows);

    const tableNode = {
      ...sampleTableNode,
      data: { ...sampleTableNode.data, isActive: true },
    };
    const fbTableNode = {
      ...sampleFacebookTableNode,
      data: { ...sampleFacebookTableNode.data, isActive: false },
    };

    const nodes = [
      ...dataNodes,
      tableNode,
      sampleFacebookAdNode,
      fbTableNode,
      sampleSchemaNode,
    ];
    const edges = [...dataEdges, ...sampleTableEdges, ...sampleSchemaEdges];

    const tableCount = nodes.filter((n) => n.type === 'tableNode').length;
    const schemaCount = nodes.filter((n) => n.type === 'schemaNode').length;

    const flow = await DataFlow.create({
      clientId,
      name: name.trim(),
      nodes,
      edges,
      activeTableNodeId: tableNode.id,
      tableCounter: tableCount,
      schemaCounter: schemaCount,
      createdBy: session.user.id,
      lastModifiedBy: session.user.id,
    });

    return NextResponse.json(flow, { status: 201 });
  } catch (error) {
    console.error('Error creating data flow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
