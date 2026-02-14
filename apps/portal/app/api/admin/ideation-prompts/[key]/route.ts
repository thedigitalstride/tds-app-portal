import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/permissions';
import { UnauthorizedError, ForbiddenError } from '@/lib/permissions';
import { connectDB, IdeationPromptOverride, IDEATION_PROMPT_KEYS, type IdeationPromptKey } from '@tds/database';
import { invalidatePromptCache, getDefaultPrompt } from '@/lib/ai/prompts/ideation/prompt-service';

export const dynamic = 'force-dynamic';

function isValidKey(key: string): key is IdeationPromptKey {
  return (IDEATION_PROMPT_KEYS as readonly string[]).includes(key);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await requireAdmin();
    const { key } = await params;

    if (!isValidKey(key)) {
      return NextResponse.json({ error: `Invalid prompt key: ${key}` }, { status: 400 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required and must be a non-empty string' }, { status: 400 });
    }

    await connectDB();
    const override = await IdeationPromptOverride.findOneAndUpdate(
      { promptKey: key },
      { content: content.trim(), updatedBy: session.user.id },
      { upsert: true, new: true }
    );

    invalidatePromptCache();

    return NextResponse.json({
      key,
      content: override.content,
      updatedAt: override.updatedAt,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to save ideation prompt override:', error);
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await requireAdmin();
    const { key } = await params;

    if (!isValidKey(key)) {
      return NextResponse.json({ error: `Invalid prompt key: ${key}` }, { status: 400 });
    }

    await connectDB();
    await IdeationPromptOverride.deleteOne({ promptKey: key });

    invalidatePromptCache();

    return NextResponse.json({
      key,
      defaultContent: getDefaultPrompt(key),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to reset ideation prompt override:', error);
    return NextResponse.json({ error: 'Failed to reset override' }, { status: 500 });
  }
}
