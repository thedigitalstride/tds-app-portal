import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isAtLeastAdmin } from '@/lib/permissions';
import { connectDB, Idea } from '@tds/database';

export const dynamic = 'force-dynamic';

// POST /api/tools/ideation/[id]/vote — Upvote or downvote
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
    const { value } = await request.json();

    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: 'Value must be 1 or -1' }, { status: 400 });
    }

    await connectDB();

    const idea = await Idea.findById(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check access — owner, collaborator, reviewer, or admin
    const userId = session.user.id;
    const isOwner = idea.createdBy.toString() === userId;
    const isCollaborator = idea.collaborators?.some((c) => c.toString() === userId);
    const isReviewer = idea.reviewers?.some((r) => r.userId.toString() === userId);
    const isAdmin = isAtLeastAdmin(session.user.role);

    if (!isOwner && !isCollaborator && !isReviewer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove existing vote from this user
    const existingIndex = idea.votes.findIndex(
      (v) => v.userId.toString() === session.user.id
    );

    if (existingIndex !== -1) {
      const existingVote = idea.votes[existingIndex];
      if (existingVote.value === value) {
        // Same vote — remove it (toggle off)
        idea.votes.splice(existingIndex, 1);
      } else {
        // Different vote — update it
        idea.votes[existingIndex].value = value;
        idea.votes[existingIndex].createdAt = new Date();
      }
    } else {
      // New vote
      idea.votes.push({
        userId: session.user.id as unknown as typeof idea.votes[0]['userId'],
        value: value as 1 | -1,
        createdAt: new Date(),
      });
    }

    // Recalculate vote score
    idea.voteScore = idea.votes.reduce((sum, v) => sum + v.value, 0);

    await idea.save();

    return NextResponse.json({
      voteScore: idea.voteScore,
      votes: idea.votes,
    });
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
