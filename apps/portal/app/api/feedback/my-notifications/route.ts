import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Feedback } from '@tds/database';

export const dynamic = 'force-dynamic';

// GET /api/feedback/my-notifications — Fetch unseen resolved feedback for current user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await connectDB();

    const feedbackItems = await Feedback.find({
      submittedBy: session.user.id,
      status: 'resolved',
      resolvedNotificationSeen: false,
    })
      .select('_id description type toolName updatedAt notes')
      .sort({ updatedAt: -1 })
      .lean();

    const notifications = feedbackItems.map((item) => ({
      feedbackId: item._id.toString(),
      description:
        item.description.length > 80
          ? item.description.slice(0, 80) + '…'
          : item.description,
      type: item.type,
      toolName: item.toolName,
      resolvedAt: item.updatedAt.toISOString(),
      hasNotes: (item.notes?.length ?? 0) > 0,
    }));

    return NextResponse.json({ notifications, count: notifications.length });
  } catch (error) {
    console.error('Error fetching feedback notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/feedback/my-notifications — Mark notification(s) as seen
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json();
    const feedbackIds: string[] =
      body.feedbackIds || (body.feedbackId ? [body.feedbackId] : []);

    if (feedbackIds.length === 0) {
      return NextResponse.json(
        { error: 'feedbackIds or feedbackId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    await Feedback.updateMany(
      {
        _id: { $in: feedbackIds },
        submittedBy: session.user.id,
      },
      { $set: { resolvedNotificationSeen: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking feedback notifications as seen:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
