import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isAtLeastAdmin } from '@/lib/permissions';
import { connectDB, Idea } from '@tds/database';

export const dynamic = 'force-dynamic';

// POST /api/tools/ideation/[id]/comment — Add a team comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await connectDB();

    // Check access — owner, collaborator, reviewer, or admin
    const existing = await Idea.findById(id).select('createdBy collaborators reviewers').lean();
    if (!existing) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const isOwner = existing.createdBy.toString() === userId;
    const isCollaborator = existing.collaborators?.some((c) => c.toString() === userId);
    const isReviewer = existing.reviewers?.some((r) => r.userId.toString() === userId);
    const isAdmin = isAtLeastAdmin(session.user.role);

    if (!isOwner && !isCollaborator && !isReviewer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const idea = await Idea.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            userId: session.user.id,
            content: content.trim(),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate('comments.userId', 'name image');

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    return NextResponse.json({ comments: idea.comments });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
