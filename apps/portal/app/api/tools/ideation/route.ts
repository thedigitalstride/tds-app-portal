import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea } from '@tds/database';
import { sendIdeationMessage } from '@/lib/ai/ideation-ai-service';
import { getTemplate } from '@/app/tools/ideation/lib/templates';

export const dynamic = 'force-dynamic';

// GET /api/tools/ideation — List all ideas the user can see
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {
      $or: [
        { createdBy: session.user.id },
        { collaborators: session.user.id },
        { 'reviewers.userId': session.user.id },
      ],
    };

    if (status) {
      filter.status = status;
    }

    const ideas = await Idea.find(filter)
      .populate('createdBy', 'name image')
      .populate('collaborators', 'name image')
      .populate('reviewers.userId', 'name image')
      .populate('reviewers.invitedBy', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    const summaries = ideas.map((idea) => ({
      _id: idea._id,
      title: idea.title,
      status: idea.status,
      currentStage: idea.currentStage,
      template: idea.template,
      scoring: idea.scoring
        ? { overall: idea.scoring.overall }
        : undefined,
      voteScore: idea.voteScore,
      commentCount: idea.comments?.length || 0,
      createdBy: idea.createdBy,
      collaborators: idea.collaborators,
      reviewers: idea.reviewers || [],
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
    }));

    return NextResponse.json({ ideas: summaries });
  } catch (error) {
    console.error('Error listing ideas:', error);
    return NextResponse.json({ error: 'Failed to list ideas' }, { status: 500 });
  }
}

// POST /api/tools/ideation — Create a new idea
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { templateId, inspirationContext } = body;

    const template = templateId ? getTemplate(templateId) : null;

    // Create the idea
    const idea = await Idea.create({
      title: 'Untitled Idea',
      createdBy: session.user.id,
      template: templateId || null,
    });

    // Generate the first AI message
    const templateContext = template?.preSeededContext || inspirationContext || undefined;

    const { response: aiResponse, raw } = await sendIdeationMessage({
      stage: 'seed',
      stageMessages: [],
      previousStagesData: {},
      templateContext,
    });

    // Save the AI message to the seed stage
    idea.stages.seed.messages.push({
      role: 'assistant',
      content: aiResponse.message,
      options: aiResponse.options,
      timestamp: new Date(),
    });
    idea.totalTokensUsed =
      (raw.usage?.inputTokens || 0) + (raw.usage?.outputTokens || 0);
    idea.aiModel = raw.model;

    if (aiResponse.suggestedTitle) {
      idea.title = aiResponse.suggestedTitle;
    }

    await idea.save();

    return NextResponse.json({
      idea: {
        _id: idea._id,
        title: idea.title,
        status: idea.status,
        currentStage: idea.currentStage,
      },
    });
  } catch (error) {
    console.error('Error creating idea:', error);
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 });
  }
}
