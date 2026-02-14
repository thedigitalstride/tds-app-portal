import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/permissions';
import { UnauthorizedError, ForbiddenError } from '@/lib/permissions';
import { getAllPrompts } from '@/lib/ai/prompts/ideation/prompt-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const prompts = await getAllPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch ideation prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}
