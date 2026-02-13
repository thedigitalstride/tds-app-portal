import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { generateInspiration } from '@/lib/ai/ideation-ai-service';

export const dynamic = 'force-dynamic';

// POST /api/tools/ideation/inspire — AI generates idea seeds
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ideas, raw } = await generateInspiration();

    return NextResponse.json({
      ideas,
      tokensUsed: (raw.usage?.inputTokens || 0) + (raw.usage?.outputTokens || 0),
    });
  } catch (error) {
    console.error('Error generating inspiration:', error);
    return NextResponse.json({ error: 'Failed to generate inspiration' }, { status: 500 });
  }
}
