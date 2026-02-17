import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Feedback } from '@tds/database';

export const dynamic = 'force-dynamic';

// GET /api/feedback/mine — Fetch all feedback submitted by the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statuses = searchParams.getAll('status').filter((s) =>
      ['new', 'reviewed', 'resolved'].includes(s)
    );
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    await connectDB();

    const query: Record<string, unknown> = { submittedBy: session.user.id };
    if (statuses.length > 0) {
      query.status = { $in: statuses };
    }

    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .populate('clientId', 'name')
        .populate('notes.author', 'name email image')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(query),
    ]);

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
