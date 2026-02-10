import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { calculateScore } from '@/app/tools/meta-tag-analyser/lib/scoring';
import { getPage } from '@/lib/services/page-store-service';
import { UnauthorizedError, ForbiddenError } from '@/lib/permissions';
import { parseAllMetaTags, decodeHtmlEntities } from './lib/parse-html';
import { analyzeMetaTags } from './lib/analyze';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, clientId } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // clientId is REQUIRED - Page Store is the single source of truth
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Get HTML content from Page Store - the SINGLE SOURCE OF TRUTH for all page content
    let html: string;
    let snapshotId: string;

    try {
      const pageResult = await getPage({
        url: validUrl.toString(),
        clientId,
        userId: session.user.id,
        toolId: 'meta-tag-analyser',
      });
      html = pageResult.html;
      snapshotId = pageResult.snapshot._id.toString();
    } catch (pageError) {
      if (pageError instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (pageError instanceof ForbiddenError) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json(
        { error: pageError instanceof Error ? pageError.message : 'Failed to fetch URL' },
        { status: 400 }
      );
    }

    // Parse all meta tags using shared library
    const result = await parseAllMetaTags(html, validUrl.toString());

    // Extract "other" meta tags (main route only — not needed by batch/queue/rescan)
    const otherMetas: Array<{ name: string; content: string }> = [];
    const metaRegex = /<meta[^>]*name=["']([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
    let match;
    const knownMetas = ['description', 'robots', 'viewport', 'author', 'keywords'];

    while ((match = metaRegex.exec(html)) !== null) {
      const name = match[1].toLowerCase();
      if (!knownMetas.includes(name) && !name.startsWith('og:') && !name.startsWith('twitter:')) {
        otherMetas.push({ name: match[1], content: decodeHtmlEntities(match[2]) });
      }
    }

    // Add "other" to the result for the main route response
    const resultWithOther = {
      ...result,
      other: otherMetas.slice(0, 20), // Limit to 20 other tags
    };

    // Run comprehensive analysis
    const issues = analyzeMetaTags(result);

    // Calculate score using the severity-based algorithm
    // Pass imageValidation so broken images are not counted as "present"
    const { score, categoryScores } = calculateScore(result, issues, result.imageValidation);

    return NextResponse.json({ result: resultWithOther, issues, score, categoryScores, snapshotId });
  } catch (error) {
    console.error('Meta tag analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze URL. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
