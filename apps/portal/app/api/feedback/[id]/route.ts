import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isAtLeastAdmin } from '@/lib/permissions';
import { connectDB, Feedback } from '@tds/database';
import { sendStatusChangeNotification } from '@/lib/services/slack-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update feedback
    if (!isAtLeastAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    // Validate status if provided
    const validStatuses = ['new', 'reviewed', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    await connectDB();

    // Pre-read to capture old status and creator info for Slack notification
    const existingFeedback = status
      ? await Feedback.findById(id)
          .populate<{ submittedBy: { name: string; email: string } }>(
            'submittedBy',
            'name email'
          )
          .lean()
      : null;

    if (status && !existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateObj: Record<string, unknown> = {};
    if (status) {
      updateObj.status = status;
      if (status === 'resolved') {
        updateObj.resolvedNotificationSeen = false;
      }
    }

    // If a note is provided, push it to the notes array
    let pushObj: Record<string, unknown> | undefined;
    if (note && typeof note === 'string' && note.trim()) {
      pushObj = {
        notes: {
          text: note.trim(),
          author: session.user.id,
          createdAt: new Date(),
        },
      };
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      {
        ...(Object.keys(updateObj).length > 0 ? { $set: updateObj } : {}),
        ...(pushObj ? { $push: pushObj } : {}),
      },
      { new: true }
    ).populate('notes.author', 'name email image');

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Send Slack notification if status actually changed
    if (status && existingFeedback && status !== existingFeedback.status) {
      const creator = existingFeedback.submittedBy;
      sendStatusChangeNotification({
        feedbackId: id,
        feedbackType: existingFeedback.type,
        feedbackDescription: existingFeedback.description,
        oldStatus: existingFeedback.status,
        newStatus: status,
        changedByName: session.user.name,
        creatorEmail: creator.email,
        creatorName: creator.name,
      }).catch(console.error);
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Failed to update feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view individual feedback details
    if (!isAtLeastAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await connectDB();

    const feedback = await Feedback.findById(id)
      .populate('submittedBy', 'name email image')
      .populate('clientId', 'name')
      .populate('notes.author', 'name email image')
      .lean();

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
