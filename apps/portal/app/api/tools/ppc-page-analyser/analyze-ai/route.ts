import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PpcPageAnalysis, type IAdData } from '@tds/database';
import { getPage } from '@/lib/services/page-store-service';
import {
  analyzeWithAI,
  isAIConfigured,
  getAvailableProviders,
  type AIProvider,
  type AnalysisFocus,
  AIServiceError,
} from '@/lib/ai';
import { analyzePageContent } from '../analyze';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for AI analysis

// GET - Check AI configuration status
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configured = isAIConfigured();
    const providers = getAvailableProviders();

    return NextResponse.json({
      configured,
      providers,
    });
  } catch (error) {
    console.error('Failed to check AI config:', error);
    return NextResponse.json(
      { error: 'Failed to check AI configuration' },
      { status: 500 }
    );
  }
}

// POST - Run AI analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId,
      url,
      adData,
      aiProvider = 'claude',
      aiModel,
      analysisFocus = 'general',
      forceRefresh = false,
    } = body as {
      clientId: string;
      url: string;
      adData: IAdData;
      aiProvider?: AIProvider;
      aiModel?: string;
      analysisFocus?: AnalysisFocus;
      forceRefresh?: boolean;
    };

    // Validate required fields
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (!adData) {
      return NextResponse.json({ error: 'adData is required' }, { status: 400 });
    }

    if (!adData.headlines || adData.headlines.length === 0) {
      return NextResponse.json(
        { error: 'At least one headline is required' },
        { status: 400 }
      );
    }

    if (!adData.descriptions || adData.descriptions.length === 0) {
      return NextResponse.json(
        { error: 'At least one description is required' },
        { status: 400 }
      );
    }

    // Check AI configuration
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'No AI provider is configured. Please set API keys.' },
        { status: 503 }
      );
    }

    const availableProviders = getAvailableProviders();
    if (!availableProviders.includes(aiProvider)) {
      return NextResponse.json(
        {
          error: `${aiProvider} is not configured. Available providers: ${availableProviders.join(', ')}`,
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Get page content via Page Store
    const pageResult = await getPage({
      url,
      clientId,
      userId: session.user.id,
      toolId: 'ppc-page-analyser',
      forceRefresh,
    });

    // Extract V1 fields (headline, subheadline) via DOM parsing
    const v1Analysis = analyzePageContent(pageResult.html, url);

    // Run AI analysis
    const analysisResponse = await analyzeWithAI({
      pageContent: {
        html: pageResult.html,
        url,
      },
      adData,
      provider: aiProvider,
      model: aiModel,
      focus: analysisFocus,
    });

    const now = new Date();

    // Check if URL already exists for this client
    const existingAnalysis = await PpcPageAnalysis.findOne({ clientId, url });

    if (existingAnalysis) {
      // Create history entry from current state
      const historyEntry = {
        scannedAt: now,
        scannedBy: session.user.id,
        score: existingAnalysis.score,
        changesDetected: true,
        pageSnapshotId: existingAnalysis.analyzedSnapshotId,
        categoryScores: existingAnalysis.categoryScores,
        snapshot: {
          headline: existingAnalysis.headline,
          subheadline: existingAnalysis.subheadline,
          conversionElements: existingAnalysis.conversionElements,
          issues: existingAnalysis.issues,
        },
      };

      // Update existing analysis with V2 data
      const updatedAnalysis = await PpcPageAnalysis.findByIdAndUpdate(
        existingAnalysis._id,
        {
          $set: {
            // V1 fields from DOM extraction
            headline: v1Analysis.headline,
            subheadline: v1Analysis.subheadline,
            // V2 fields
            sourceType: 'manual_entry',
            analysisType: 'single_ad',
            adData,
            aiProvider,
            aiModel: analysisResponse.model,
            analysisFocus,
            analysisV2: analysisResponse.result,
            analysisTimeMs: analysisResponse.analysisTimeMs,
            // Update overall score from V2 analysis
            score: analysisResponse.result.overallScore,
            // Update tracking
            lastScannedAt: now,
            lastScannedBy: session.user.id,
            analyzedSnapshotId: pageResult.snapshot._id,
            currentSnapshotId: pageResult.snapshot._id,
          },
          $push: {
            scanHistory: {
              $each: [historyEntry],
              $slice: -50,
            },
          },
          $inc: { scanCount: 1 },
        },
        { new: true }
      );

      return NextResponse.json({
        analysis: JSON.parse(JSON.stringify(updatedAnalysis)),
        aiResponse: {
          model: analysisResponse.model,
          provider: analysisResponse.provider,
          analysisTimeMs: analysisResponse.analysisTimeMs,
          usage: analysisResponse.usage,
        },
        isUpdate: true,
        wasCached: pageResult.wasCached,
      });
    }

    // Create new analysis with V2 data
    const newAnalysis = await PpcPageAnalysis.create({
      clientId,
      url,
      // V1 fields from DOM extraction
      headline: v1Analysis.headline,
      subheadline: v1Analysis.subheadline,
      // V2 fields
      sourceType: 'manual_entry',
      analysisType: 'single_ad',
      adData,
      aiProvider,
      aiModel: analysisResponse.model,
      analysisFocus,
      analysisV2: analysisResponse.result,
      analysisTimeMs: analysisResponse.analysisTimeMs,
      // Overall score from V2 analysis
      score: analysisResponse.result.overallScore,
      // Tracking
      analyzedBy: session.user.id,
      analyzedAt: now,
      scanCount: 1,
      lastScannedAt: now,
      lastScannedBy: session.user.id,
      analyzedSnapshotId: pageResult.snapshot._id,
      currentSnapshotId: pageResult.snapshot._id,
      scanHistory: [],
      // Empty V1 fields for compatibility
      conversionElements: [],
      issues: [],
    });

    return NextResponse.json({
      analysis: JSON.parse(JSON.stringify(newAnalysis)),
      aiResponse: {
        model: analysisResponse.model,
        provider: analysisResponse.provider,
        analysisTimeMs: analysisResponse.analysisTimeMs,
        usage: analysisResponse.usage,
      },
      isUpdate: false,
      wasCached: pageResult.wasCached,
    });
  } catch (error) {
    if (error instanceof AIServiceError) {
      console.error('AI Service Error:', error);
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          provider: error.provider,
        },
        { status: error.statusCode || 500 }
      );
    }

    console.error('Failed to run AI analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run AI analysis' },
      { status: 500 }
    );
  }
}
