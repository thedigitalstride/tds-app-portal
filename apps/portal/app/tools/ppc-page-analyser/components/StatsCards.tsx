'use client';

import React from 'react';
import { FileText, BarChart3, AlertCircle, AlertTriangle, Scan } from 'lucide-react';
import { Card, CardHeader, CardDescription, CardTitle } from '@tds/ui';

interface StatsCardsProps {
  totalUrls: number;
  totalScans: number;
  averageScore: number;
  errorCount: number;
  warningCount: number;
  isLoading?: boolean;
}

export function StatsCards({
  totalUrls,
  totalScans,
  averageScore,
  errorCount,
  warningCount,
  isLoading = false,
}: StatsCardsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
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
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardDescription className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Landing Pages
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

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardDescription className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Avg Score
          </CardDescription>
          <CardTitle className={`text-2xl ${getScoreColor(averageScore)}`}>
            {averageScore > 0 ? `${averageScore}%` : '-'}
          </CardTitle>
        </CardHeader>
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
  );
}
