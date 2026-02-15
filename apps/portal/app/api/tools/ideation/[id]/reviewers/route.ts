import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea } from '@tds/database';

export const dynamic = 'force-dynamic';

// POST /api/tools/ideation/[id]/reviewers — Invite reviewers (owner only)
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
    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array is required' }, { status: 400 });
    }

    await connectDB();

    const idea = await Idea.findOne({ _id: id, createdBy: session.user.id });
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found or access denied' }, { status: 404 });
    }

    const existingReviewerIds = new Set(
      idea.reviewers.map((r) => r.userId.toString())
    );
    const collaboratorIds = new Set(
      idea.collaborators.map((c) => c.toString())
    );

    const newReviewers = userIds.filter(
      (uid: string) => !existingReviewerIds.has(uid) && !collaboratorIds.has(uid) && uid !== session.user.id
    );

    if (newReviewers.length > 0) {
      for (const uid of newReviewers) {
        idea.reviewers.push({
          userId: uid as unknown as typeof idea.reviewers[0]['userId'],
          invitedBy: session.user.id as unknown as typeof idea.reviewers[0]['invitedBy'],
          invitedAt: new Date(),
          seen: false,
        });
      }
      await idea.save();
    }

    // Return populated reviewers
    const populated = await Idea.findById(id)
      .select('reviewers')
      .populate('reviewers.userId', 'name image')
      .populate('reviewers.invitedBy', 'name')
      .lean();

    return NextResponse.json({ reviewers: populated?.reviewers || [] });
  } catch (error) {
    console.error('Error inviting reviewers:', error);
    return NextResponse.json({ error: 'Failed to invite reviewers' }, { status: 500 });
  }
}

// DELETE /api/tools/ideation/[id]/reviewers — Remove a reviewer (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await connectDB();

    const idea = await Idea.findOneAndUpdate(
      { _id: id, createdBy: session.user.id },
      { $pull: { reviewers: { userId } } },
      { new: true }
    )
      .select('reviewers')
      .populate('reviewers.userId', 'name image')
      .populate('reviewers.invitedBy', 'name');

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ reviewers: idea.reviewers });
  } catch (error) {
    console.error('Error removing reviewer:', error);
    return NextResponse.json({ error: 'Failed to remove reviewer' }, { status: 500 });
  }
}
