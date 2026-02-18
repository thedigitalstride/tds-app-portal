import { connectDB, User } from '@tds/database';

// ---------------------------------------------------------------------------
// Slack webhook helper
// ---------------------------------------------------------------------------

async function sendSlackWebhook(blocks: object[]): Promise<void> {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('SLACK_FEEDBACK_WEBHOOK_URL not configured, skipping notification');
    return;
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });
}

// ---------------------------------------------------------------------------
// Slack user ID lookup (with caching on User model)
// ---------------------------------------------------------------------------

export async function lookupSlackUserId(
  email: string
): Promise<string | null> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    console.log('SLACK_BOT_TOKEN not configured, skipping Slack user lookup');
    return null;
  }

  await connectDB();

  // Check cache first
  const user = await User.findOne({ email });
  if (user?.slackUserId) {
    return user.slackUserId;
  }

  try {
    const response = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );
    const data = await response.json();

    if (data.ok && data.user?.id) {
      // Cache the Slack user ID for future lookups
      if (user) {
        await User.updateOne(
          { _id: user._id },
          { $set: { slackUserId: data.user.id } }
        );
      }
      return data.user.id as string;
    }

    if (!data.ok) {
      console.log(`Slack user lookup failed for ${email}: ${data.error}`);
    }
    return null;
  } catch (error) {
    console.error('Slack API error during user lookup:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// New feedback notification (extracted from feedback POST route)
// ---------------------------------------------------------------------------

const TYPE_EMOJI: Record<string, string> = {
  bug: ':bug:',
  feature: ':bulb:',
  question: ':question:',
  other: ':speech_balloon:',
};

const TYPE_LABEL: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  question: 'Question',
  other: 'Other',
};

export async function sendNewFeedbackNotification(feedback: {
  type: string;
  urgency: string;
  description: string;
  toolName: string | null;
  pageUrl: string;
  clientName: string | null;
  submittedByName: string;
  feedbackId: string;
  screenshotUrl: string | null;
}): Promise<void> {
  const typeEmoji = TYPE_EMOJI[feedback.type] || ':speech_balloon:';
  const typeLabel = TYPE_LABEL[feedback.type] || 'Feedback';

  const urgencyLabel: Record<string, string> = {
    low: 'Nice to have',
    medium: 'Important',
    high: 'Blocking',
  };

  const adminUrl = `${process.env.NEXTAUTH_URL}/admin/feedback`;

  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${typeEmoji} *New ${typeLabel}* (${urgencyLabel[feedback.urgency] || feedback.urgency})\n\n"${feedback.description.slice(0, 200)}${feedback.description.length > 200 ? '...' : ''}"`,
      },
    },
    { type: 'divider' },
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
          text: { type: 'plain_text', text: 'View in Admin' },
          url: adminUrl,
        },
        ...(feedback.screenshotUrl
          ? [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Screenshot' },
                url: feedback.screenshotUrl,
              },
            ]
          : []),
      ],
    },
  ];

  try {
    await sendSlackWebhook(blocks);
  } catch (error) {
    console.error('Failed to send new-feedback Slack notification:', error);
  }
}

// ---------------------------------------------------------------------------
// Status change notification
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
};

export async function sendStatusChangeNotification(params: {
  feedbackId: string;
  feedbackType: string;
  feedbackDescription: string;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
  creatorEmail: string;
  creatorName: string;
}): Promise<void> {
  const {
    feedbackType,
    feedbackDescription,
    oldStatus,
    newStatus,
    changedByName,
    creatorEmail,
    creatorName,
  } = params;

  // Resolve Slack mention for feedback creator
  const slackUserId = await lookupSlackUserId(creatorEmail);
  const mentionText = slackUserId ? `<@${slackUserId}>` : creatorName;

  const adminUrl = `${process.env.NEXTAUTH_URL}/admin/feedback`;
  const emoji = TYPE_EMOJI[feedbackType] || ':speech_balloon:';
  const label = TYPE_LABEL[feedbackType] || 'Feedback';
  const oldLabel = STATUS_LABEL[oldStatus] || oldStatus;
  const newLabel = STATUS_LABEL[newStatus] || newStatus;

  const truncatedDesc =
    feedbackDescription.length > 150
      ? feedbackDescription.slice(0, 150) + '...'
      : feedbackDescription;

  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:arrows_counterclockwise: *Feedback Status Updated*\n\n${emoji} ${label}  ·  *${oldLabel}* → *${newLabel}*\n\n"${truncatedDesc}"`,
      },
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Submitted by ${mentionText}  ·  Changed by ${changedByName}`,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in Admin' },
          url: adminUrl,
        },
      ],
    },
  ];

  try {
    await sendSlackWebhook(blocks);
  } catch (error) {
    console.error('Failed to send status-change Slack notification:', error);
  }
}
