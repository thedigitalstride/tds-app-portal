import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea, type ScoreRecommendation } from '@tds/database';
import { scoreIdea } from '@/lib/ai/ideation-ai-service';

export const dynamic = 'force-dynamic';

// POST /api/tools/ideation/[id]/score — Generate or regenerate AI scoring
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

    const { scoring, raw } = await scoreIdea({
      stages: idea.stages,
      title: idea.title,
      tracking: {
        toolId: 'ideation',
        userId: session.user.id,
        purpose: 'scoring',
        resourceId: id,
        resourceType: 'idea',
      },
    });

    idea.scoring = {
      viability: scoring.viability,
      uniqueness: scoring.uniqueness,
      effort: scoring.effort,
      overall: {
        score: scoring.overall.score,
        recommendation: scoring.overall.recommendation as ScoreRecommendation,
      },
      scoredAt: new Date(),
    };

    idea.totalTokensUsed +=
      (raw.usage?.inputTokens || 0) + (raw.usage?.outputTokens || 0);

    await idea.save();

    return NextResponse.json({ scoring: idea.scoring });
  } catch (error) {
    console.error('Error scoring idea:', error);
    return NextResponse.json({ error: 'Failed to score idea' }, { status: 500 });
  }
}
