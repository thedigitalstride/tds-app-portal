import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from '@/lib/auth';
import { isAtLeastAdmin } from '@/lib/permissions';
import { connectDB, Feedback } from '@tds/database';

export const dynamic = 'force-dynamic';

// Slack webhook helper
async function sendSlackNotification(feedback: {
  type: string;
  urgency: string;
  description: string;
  toolName: string | null;
  pageUrl: string;
  clientName: string | null;
  submittedByName: string;
  feedbackId: string;
  screenshotUrl: string | null;
}) {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Slack webhook URL not configured, skipping notification');
    return;
  }

  const typeEmoji = {
    bug: ':bug:',
    feature: ':bulb:',
    question: ':question:',
    other: ':speech_balloon:',
  }[feedback.type] || ':speech_balloon:';

  const typeLabel = {
    bug: 'Bug Report',
    feature: 'Feature Request',
    question: 'Question',
    other: 'Other',
  }[feedback.type] || 'Feedback';

  const urgencyLabel = {
    low: 'Nice to have',
    medium: 'Important',
    high: 'Blocking',
  }[feedback.urgency] || feedback.urgency;

  const adminUrl = `${process.env.NEXTAUTH_URL}/admin/feedback`;

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${typeEmoji} *New ${typeLabel}* (${urgencyLabel})\n\n"${feedback.description.slice(0, 200)}${feedback.description.length > 200 ? '...' : ''}"`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: [
            feedback.toolName ? `*Tool:* ${feedback.toolName}` : null,
            `*Page:* ${feedback.pageUrl}`,
            feedback.clientName ? `*Client:* ${feedback.clientName}` : null,
            `*Submitted by:* ${feedback.submittedByName}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View in Admin',
          },
          url: adminUrl,
        },
        ...(feedback.screenshotUrl
          ? [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Screenshot',
                },
                url: feedback.screenshotUrl,
              },
            ]
          : []),
      ],
    },
  ];

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();

    const type = formData.get('type') as string;
    const urgency = formData.get('urgency') as string;
    const description = formData.get('description') as string;
    const pageUrl = formData.get('pageUrl') as string;
    const toolId = formData.get('toolId') as string;
    const toolName = formData.get('toolName') as string;
    const clientId = formData.get('clientId') as string;
    const browser = formData.get('browser') as string;
    const viewport = JSON.parse(formData.get('viewport') as string);
    const userAgent = formData.get('userAgent') as string;
    const consoleErrors = JSON.parse(formData.get('consoleErrors') as string || '[]');
    const screenshot = formData.get('screenshot') as File | null;

    // Validate required fields
    if (!type || !urgency || !description || !pageUrl || !browser || !userAgent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upload screenshot to Vercel Blob if provided
    let screenshotUrl: string | null = null;
    if (screenshot && screenshot.size > 0) {
      const blob = await put(`feedback-screenshots/${Date.now()}-${session.user.id}.png`, screenshot, {
        access: 'public',
      });
      screenshotUrl = blob.url;
    }

    await connectDB();

    // Get client name for Slack notification
    let clientName: string | null = null;
    if (clientId) {
      const { Client } = await import('@tds/database');
      const client = await Client.findById(clientId);
      clientName = client?.name || null;
    }

    // Create feedback document
    const feedback = await Feedback.create({
      type,
      urgency,
      description,
      pageUrl,
      toolId: toolId || null,
      toolName: toolName || null,
      clientId: clientId || null,
      browser,
      viewport,
      userAgent,
      consoleErrors,
      screenshotUrl,
      submittedBy: session.user.id,
      status: 'new',
    });

    // Send Slack notification (non-blocking)
    sendSlackNotification({
      type,
      urgency,
      description,
      toolName: toolName || null,
      pageUrl,
      clientName,
      submittedByName: session.user.name,
      feedbackId: feedback._id.toString(),
      screenshotUrl,
    }).catch(console.error);

    return NextResponse.json({ success: true, feedbackId: feedback._id }, { status: 201 });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can list all feedback
    if (!isAtLeastAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statuses = searchParams.getAll('status').filter((s) =>
      ['new', 'reviewed', 'resolved'].includes(s)
    );
    const type = searchParams.get('type');
    const toolId = searchParams.get('toolId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    await connectDB();

    // Build query
    const query: Record<string, unknown> = {};
    if (statuses.length > 0) query.status = { $in: statuses };
    if (type) query.type = type;
    if (toolId) query.toolId = toolId;

    // Get total count
    const total = await Feedback.countDocuments(query);

    // Get feedback with pagination
    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('submittedBy', 'name email image')
      .populate('clientId', 'name')
      .lean();

    // Get count of new feedback for badge
    const newCount = await Feedback.countDocuments({ status: 'new' });

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      newCount,
    });
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
