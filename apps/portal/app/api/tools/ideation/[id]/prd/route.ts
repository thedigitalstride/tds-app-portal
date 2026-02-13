import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea } from '@tds/database';
import { generatePRD } from '@/lib/ai/ideation-ai-service';

export const dynamic = 'force-dynamic';

// POST /api/tools/ideation/[id]/prd — Generate or regenerate PRD
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

    const { response: aiResponse, raw } = await generatePRD({
      stages: idea.stages,
      title: idea.title,
    });

    // Save PRD to the prd stage
    idea.stages.prd.messages.push({
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date(),
    });

    if (aiResponse.extractedData) {
      idea.stages.prd.extractedData = {
        ...(idea.stages.prd.extractedData || {}),
        ...aiResponse.extractedData,
      };
    }

    idea.totalTokensUsed +=
      (raw.usage?.inputTokens || 0) + (raw.usage?.outputTokens || 0);

    idea.markModified('stages');
    await idea.save();

    return NextResponse.json({ aiResponse });
  } catch (error) {
    console.error('Error generating PRD:', error);
    return NextResponse.json({ error: 'Failed to generate PRD' }, { status: 500 });
  }
}
