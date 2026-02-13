import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea } from '@tds/database';

export const dynamic = 'force-dynamic';

// PATCH /api/tools/ideation/[id]/collaborators — Add/remove collaborators
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
    const { add, remove } = await request.json();

    await connectDB();

    const idea = await Idea.findOne({
      _id: id,
      createdBy: session.user.id,
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found or not owner' }, { status: 404 });
    }

    if (add && Array.isArray(add)) {
      for (const userId of add) {
        if (!idea.collaborators.some((c) => c.toString() === userId)) {
          idea.collaborators.push(userId);
        }
      }
    }

    if (remove && Array.isArray(remove)) {
      idea.collaborators = idea.collaborators.filter(
        (c) => !remove.includes(c.toString())
      );
    }

    await idea.save();

    return NextResponse.json({ collaborators: idea.collaborators });
  } catch (error) {
    console.error('Error updating collaborators:', error);
    return NextResponse.json({ error: 'Failed to update collaborators' }, { status: 500 });
  }
}
