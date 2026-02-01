import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PpcPageAnalysis } from '@tds/database';
import { canAccessClient } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Fetch a single analysis by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const analysis = await PpcPageAnalysis.findById(id)
      .populate('analyzedBy', 'name email')
      .populate('lastScannedBy', 'name email')
      .populate('scanHistory.scannedBy', 'name email')
      .lean();

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Verify user has access to the client that owns this analysis
    const hasAccess = await canAccessClient(session.user.id, analysis.clientId.toString());
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Failed to fetch analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a single analysis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    // First fetch the analysis to verify client access
    const analysis = await PpcPageAnalysis.findById(id);

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Verify user has access to the client that owns this analysis
    const hasAccess = await canAccessClient(session.user.id, analysis.clientId.toString());
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await PpcPageAnalysis.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete analysis:', error);
    return NextResponse.json(
      { error: 'Failed to delete analysis' },
      { status: 500 }
    );
  }
}
