'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button, Card } from '@tds/ui';
import { useToast } from '@/components/toast-context';
import { AnalysisReport } from '../components/AnalysisReport';
import type { SavedAnalysis } from '../components/types';

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRescanning, setIsRescanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analysisId = params.id as string;

  // Fetch analysis data
  useEffect(() => {
    async function fetchAnalysis() {
      if (!analysisId) return;

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/tools/ppc-page-analyser/saved/${analysisId}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError('Analysis not found');
          } else {
            const data = await res.json();
            setError(data.error || 'Failed to load analysis');
          }
          return;
        }

        const data = await res.json();
        setAnalysis(data);
      } catch (err) {
        console.error('Failed to fetch analysis:', err);
        setError('Failed to load analysis');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
  }, [analysisId]);

  // Handle rescan
  const handleRescan = async () => {
    if (!analysis) return;

    setIsRescanning(true);

    try {
      const res = await fetch(`/api/tools/ppc-page-analyser/saved/${analysisId}/rescan`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Rescan failed');
      }

      const data = await res.json();
      setAnalysis(data.analysis);

      addToast({
        type: 'success',
        message: data.changesDetected
          ? 'Rescan complete - changes detected'
          : 'Rescan complete - no changes detected',
      });
    } catch (err) {
      console.error('Rescan failed:', err);
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Rescan failed',
      });
    } finally {
      setIsRescanning(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !analysis) {
    return (
      <div className="p-6 lg:p-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/tools/ppc-page-analyser')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>

        <Card className="p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              {error || 'Analysis Not Found'}
            </h2>
            <p className="text-neutral-500 mb-6">
              The analysis you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => router.push('/tools/ppc-page-analyser')}>
              Go to Library
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Get previous score from scan history if available
  // scanHistory uses $push + $slice: -50, so newest entries are at the END of the array
  const previousScore = analysis.scanHistory?.length
    ? analysis.scanHistory[analysis.scanHistory.length - 1]?.score
    : undefined;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/tools/ppc-page-analyser')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>

        <Button
          variant="outline"
          onClick={handleRescan}
          disabled={isRescanning}
        >
          {isRescanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Rescanning...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rescan
            </>
          )}
        </Button>
      </div>

      {/* V2 Analysis Report */}
      {analysis.analysisV2 ? (
        <AnalysisReport
          url={analysis.url}
          analysisV2={analysis.analysisV2}
          adData={analysis.adData}
          aiProvider={analysis.aiProvider}
          aiModel={analysis.aiModel}
          analysisFocus={analysis.analysisFocus}
          analysisTimeMs={analysis.analysisTimeMs}
          analyzedAt={analysis.lastScannedAt || analysis.analyzedAt}
          previousScore={previousScore}
        />
      ) : (
        // Fallback for V1 analyses (basic view)
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">
              {analysis.url}
            </h2>
            <p className="text-sm text-neutral-500">
              Score: {analysis.score}/100
            </p>
          </div>

          {analysis.headline && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-neutral-700">Headline</h3>
              <p className="text-neutral-600">{analysis.headline}</p>
            </div>
          )}

          {analysis.issues && analysis.issues.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Issues</h3>
              <ul className="space-y-2">
                {analysis.issues.map((issue, index) => (
                  <li
                    key={index}
                    className={`text-sm ${
                      issue.type === 'error'
                        ? 'text-red-600'
                        : issue.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}
                  >
                    [{issue.field}] {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              This is a V1 analysis. Run a new AI analysis to get detailed insights,
              recommendations, and message match analysis.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
