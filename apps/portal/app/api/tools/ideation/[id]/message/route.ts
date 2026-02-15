import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isAtLeastAdmin } from '@/lib/permissions';
import { connectDB, Idea, type IdeaStage } from '@tds/database';
import { sendIdeationMessage } from '@/lib/ai/ideation-ai-service';
import { getTemplate } from '@/app/tools/ideation/lib/templates';

export const dynamic = 'force-dynamic';

// DELETE /api/tools/ideation/[id]/message — Undo the last user+assistant exchange
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const idea = await Idea.findById(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check access
    const userId = session.user.id;
    const isOwner = idea.createdBy.toString() === userId;
    const isCollaborator = idea.collaborators.some(
      (c) => c.toString() === userId
    );
    if (!isOwner && !isCollaborator && !isAtLeastAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentStage = idea.currentStage as IdeaStage;
    const stageData = idea.stages[currentStage];
    const messages = stageData.messages;

    if (messages.length < 1) {
      return NextResponse.json(
        { error: 'Nothing to undo' },
        { status: 400 }
      );
    }

    // Remove the last assistant message (and the preceding user message if one exists)
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant') {
      const prevMsg = messages.length >= 2 ? messages[messages.length - 2] : null;
      if (prevMsg && prevMsg.role === 'user') {
        messages.splice(messages.length - 2, 2); // user + assistant
      } else {
        messages.splice(messages.length - 1, 1); // stage intro (no preceding user)
      }
    } else {
      messages.splice(messages.length - 1, 1); // just the dangling user message
    }

    idea.markModified('stages');
    await idea.save();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error undoing message:', error);
    return NextResponse.json({ error: 'Failed to undo message' }, { status: 500 });
  }
}

// POST /api/tools/ideation/[id]/message — Send a message in the conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const idea = await Idea.findById(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check access
    const userId = session.user.id;
    const isOwner = idea.createdBy.toString() === userId;
    const isCollaborator = idea.collaborators.some(
      (c) => c.toString() === userId
    );
    if (!isOwner && !isCollaborator && !isAtLeastAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content, selectedOptionId, attachments } = await request.json();
    if (!content && (!attachments || !attachments.length)) {
      return NextResponse.json({ error: 'Content or attachments required' }, { status: 400 });
    }

    const currentStage = idea.currentStage as IdeaStage;
    const stageData = idea.stages[currentStage];

    // Append user message
    stageData.messages.push({
      role: 'user',
      content: content || '',
      selectedOptionId,
      attachments: attachments?.length ? attachments : undefined,
      timestamp: new Date(),
    });

    // Gather data from previous stages
    const stageOrder: IdeaStage[] = ['seed', 'shape', 'research', 'refine', 'prd'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const previousStagesData: Record<string, Record<string, unknown>> = {};
    for (let i = 0; i < currentIndex; i++) {
      const stage = stageOrder[i];
      previousStagesData[stage] = idea.stages[stage].extractedData || {};
    }

    // Get template context if applicable
    const template = idea.template ? getTemplate(idea.template) : null;
    const templateContext = currentStage === 'seed' ? template?.preSeededContext : undefined;

    // Send to AI
    const { response: aiResponse, raw } = await sendIdeationMessage({
      stage: currentStage,
      stageMessages: stageData.messages,
      previousStagesData,
      templateContext,
      currentMessageAttachments: attachments?.length ? attachments : undefined,
      tracking: {
        toolId: 'ideation',
        userId,
        purpose: `conversation-${currentStage}`,
        resourceId: id,
        resourceType: 'idea',
      },
    });

    // Append AI response
    stageData.messages.push({
      role: 'assistant',
      content: aiResponse.message,
      options: aiResponse.options,
      timestamp: new Date(),
    });

    // Merge extracted data
    if (aiResponse.extractedData && Object.keys(aiResponse.extractedData).length > 0) {
      stageData.extractedData = {
        ...(stageData.extractedData || {}),
        ...aiResponse.extractedData,
      };
    }

    // Update title if suggested (seed stage only)
    if (aiResponse.suggestedTitle && currentStage === 'seed' && idea.title === 'Untitled Idea') {
      idea.title = aiResponse.suggestedTitle;
    }

    // Track tokens
    idea.totalTokensUsed +=
      (raw.usage?.inputTokens || 0) + (raw.usage?.outputTokens || 0);
    idea.aiModel = raw.model;

    idea.markModified('stages');
    await idea.save();

    return NextResponse.json({
      aiResponse: {
        message: aiResponse.message,
        options: aiResponse.options,
        extractedData: aiResponse.extractedData,
        stageReadiness: aiResponse.stageReadiness,
        suggestedTitle: aiResponse.suggestedTitle,
      },
      title: idea.title,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
