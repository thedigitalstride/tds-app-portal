'use client';

import React, { useState } from 'react';
import { FileText, BarChart3, AlertCircle, AlertTriangle, Scan, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from '@tds/ui';
import type { CategoryScores } from './types';

interface StatsCardsProps {
  totalUrls: number;
  totalScans: number;
  averageScore: number;
  averageCategoryScores?: CategoryScores;
  errorCount: number;
  warningCount: number;
  isLoading?: boolean;
}

const CATEGORY_LABELS: Record<keyof CategoryScores, { label: string; weight: string }> = {
  basicSeo: { label: 'Basic SEO', weight: '40%' },
  social: { label: 'Social/OG', weight: '30%' },
  twitter: { label: 'Twitter', weight: '20%' },
  technical: { label: 'Technical', weight: '10%' },
};

export function StatsCards({
  totalUrls,
  totalScans,
  averageScore,
  averageCategoryScores,
  errorCount,
  warningCount,
  isLoading = false,
}: StatsCardsProps) {
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 50) return 'bg-amber-100';
    return 'bg-red-100';
  };

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="h-3 w-16 bg-neutral-200 rounded mb-2" />
              <div className="h-7 w-12 bg-neutral-200 rounded" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              URLs
            </CardDescription>
            <CardTitle className="text-2xl">{totalUrls}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Scan className="h-3.5 w-3.5" />
              Total Scans
            </CardDescription>
            <CardTitle className="text-2xl">{totalScans}</CardTitle>
          </CardHeader>
        </Card>

        <Card className={averageCategoryScores ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
          <CardHeader
            className="pb-2 pt-4 px-4"
            onClick={() => averageCategoryScores && setShowCategoryBreakdown(!showCategoryBreakdown)}
          >
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              Avg Score
              {averageCategoryScores && (
                showCategoryBreakdown
                  ? <ChevronUp className="h-3 w-3 ml-auto" />
                  : <ChevronDown className="h-3 w-3 ml-auto" />
              )}
            </CardDescription>
            <CardTitle className={`text-2xl ${getScoreColor(averageScore)}`}>
              {averageScore > 0 ? `${averageScore}%` : '-'}
            </CardTitle>
          </CardHeader>
          {showCategoryBreakdown && averageCategoryScores && (
            <CardContent className="pt-0 pb-3 px-4">
              <div className="space-y-1.5 border-t pt-2 mt-1">
                {(Object.keys(CATEGORY_LABELS) as Array<keyof CategoryScores>).map((key) => {
                  const score = averageCategoryScores[key];
                  const { label, weight } = CATEGORY_LABELS[key];
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="text-neutral-500 w-16 truncate">{label}</span>
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBgColor(score)} transition-all`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`font-medium w-8 text-right ${getScoreColor(score)}`}>
                        {score}%
                      </span>
                      <span className="text-neutral-400 w-8">({weight})</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Errors
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">{errorCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Warnings
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600">{warningCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
