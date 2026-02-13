import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea, type IdeaStage } from '@tds/database';
import { sendIdeationMessage } from '@/lib/ai/ideation-ai-service';

export const dynamic = 'force-dynamic';

const STAGE_ORDER: IdeaStage[] = ['seed', 'shape', 'research', 'refine', 'prd'];

// PATCH /api/tools/ideation/[id]/stage — Advance or go back between stages
export async function PATCH(
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

    const { stage: rawStage } = await request.json();
    const targetStage = rawStage as IdeaStage;
    if (!STAGE_ORDER.includes(targetStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const currentIndex = STAGE_ORDER.indexOf(idea.currentStage as IdeaStage);
    const targetIndex = STAGE_ORDER.indexOf(targetStage);

    // Mark current stage as complete if advancing forward
    if (targetIndex > currentIndex) {
      idea.stages[idea.currentStage as IdeaStage].isComplete = true;
    }

    idea.currentStage = targetStage;

    // If the target stage has no messages yet, generate the first AI message
    const targetStageData = idea.stages[targetStage];
    if (targetStageData.messages.length === 0) {
      const previousStagesData: Record<string, Record<string, unknown>> = {};
      for (let i = 0; i < targetIndex; i++) {
        const stage = STAGE_ORDER[i];
        previousStagesData[stage] = idea.stages[stage].extractedData || {};
      }

      const { response: aiResponse, raw } = await sendIdeationMessage({
        stage: targetStage,
        stageMessages: [],
        previousStagesData,
      });

      targetStageData.messages.push({
        role: 'assistant',
        content: aiResponse.message,
        options: aiResponse.options,
        timestamp: new Date(),
      });

      idea.totalTokensUsed +=
        (raw.usage?.inputTokens || 0) + (raw.usage?.outputTokens || 0);
      idea.aiModel = raw.model;
    }

    idea.markModified('stages');
    await idea.save();

    return NextResponse.json({
      currentStage: idea.currentStage,
      stages: idea.stages,
    });
  } catch (error) {
    console.error('Error advancing stage:', error);
    return NextResponse.json({ error: 'Failed to advance stage' }, { status: 500 });
  }
}
