import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea } from '@tds/database';

export const dynamic = 'force-dynamic';

// GET /api/tools/ideation/review-invitations — Fetch unseen invitations for current user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await connectDB();

    const ideas = await Idea.find({
      reviewers: {
        $elemMatch: { userId: session.user.id, seen: false },
      },
    })
      .select('_id title reviewers')
      .populate('reviewers.invitedBy', 'name image')
      .lean();

    const invitations = ideas.map((idea) => {
      const myReview = idea.reviewers.find(
        (r) => r.userId.toString() === session.user.id
      );
      return {
        ideaId: idea._id.toString(),
        ideaTitle: idea.title,
        invitedBy: myReview?.invitedBy || { _id: '', name: 'Unknown' },
        invitedAt: myReview?.invitedAt?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({ invitations, count: invitations.length });
  } catch (error) {
    console.error('Error fetching review invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

// PATCH /api/tools/ideation/review-invitations — Mark invitations as seen
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json();
    const ideaIds: string[] = body.ideaIds || (body.ideaId ? [body.ideaId] : []);

    if (ideaIds.length === 0) {
      return NextResponse.json({ error: 'ideaIds or ideaId is required' }, { status: 400 });
    }

    await connectDB();

    await Idea.updateMany(
      { _id: { $in: ideaIds }, 'reviewers.userId': session.user.id },
      { $set: { 'reviewers.$[elem].seen': true } },
      { arrayFilters: [{ 'elem.userId': session.user.id }] }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking invitations as seen:', error);
    return NextResponse.json({ error: 'Failed to update invitations' }, { status: 500 });
  }
}
