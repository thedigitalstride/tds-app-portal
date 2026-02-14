import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea, type IdeaStatus } from '@tds/database';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: IdeaStatus[] = ['draft', 'approved', 'in-progress', 'completed', 'archived'];

// PATCH /api/tools/ideation/[id]/status — Update pipeline status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    const idea = await Idea.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { createdBy: session.user.id },
          { collaborators: session.user.id },
        ],
      },
      { status },
      { new: true }
    );

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ status: idea.status });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
