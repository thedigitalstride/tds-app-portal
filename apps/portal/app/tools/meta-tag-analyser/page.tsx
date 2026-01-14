'use client';

import { useState } from 'react';
import {
  Search,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw,
  Save,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Textarea,
  Skeleton,
} from '@tds/ui';

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  other: Array<{ name: string; content: string }>;
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
  field: string;
}

export default function MetaTagAnalyserPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetaTagResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<AnalysisIssue[]>([]);

  // Planner state
  const [plannerMode, setPlannerMode] = useState(false);
  const [plannedTitle, setPlannedTitle] = useState('');
  const [plannedDescription, setPlannedDescription] = useState('');

  const analyzeUrl = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setIssues([]);

    try {
      const res = await fetch('/api/tools/meta-tag-analyser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze URL');
      }

      setResult(data.result);
      setIssues(data.issues);
      setPlannedTitle(data.result.title || '');
      setPlannedDescription(data.result.description || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const titleLength = plannedTitle.length;
  const descriptionLength = plannedDescription.length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Meta Tag Analyser
        </h1>
        <p className="mt-1 text-neutral-500">
          Analyse and plan meta tags for any webpage
        </p>
      </div>

      {/* URL Input */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="Enter URL to analyse (e.g., https://example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && analyzeUrl()}
              />
            </div>
            <Button onClick={analyzeUrl} disabled={loading || !url}>
              {loading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyse
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Issues Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>
                Issues found while analysing {result.url}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>No issues found! All meta tags look good.</span>
                  </div>
                ) : (
                  issues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      {getIssueIcon(issue.type)}
                      <div>
                        <Badge
                          variant={
                            issue.type === 'error'
                              ? 'destructive'
                              : issue.type === 'warning'
                              ? 'warning'
                              : 'success'
                          }
                          className="mb-1"
                        >
                          {issue.field}
                        </Badge>
                        <p className="text-sm text-neutral-700">{issue.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Meta Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Meta Tags</CardTitle>
                <CardDescription>Title and description tags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium">Title</label>
                    <span
                      className={`text-xs ${
                        result.title.length > 60 ? 'text-red-500' : 'text-neutral-500'
                      }`}
                    >
                      {result.title.length}/60 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={result.title} readOnly className="bg-neutral-50" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(result.title)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium">Description</label>
                    <span
                      className={`text-xs ${
                        result.description.length > 160
                          ? 'text-red-500'
                          : 'text-neutral-500'
                      }`}
                    >
                      {result.description.length}/160 characters
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Textarea
                      value={result.description}
                      readOnly
                      className="bg-neutral-50"
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(result.description)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {result.canonical && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Canonical URL
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={result.canonical}
                        readOnly
                        className="bg-neutral-50"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          window.open(result.canonical, '_blank')
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {result.robots && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Robots</label>
                    <Input
                      value={result.robots}
                      readOnly
                      className="bg-neutral-50"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Graph */}
            <Card>
              <CardHeader>
                <CardTitle>Open Graph Tags</CardTitle>
                <CardDescription>Social sharing preview (Facebook, LinkedIn)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.openGraph.image && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">OG Image</label>
                    <div className="overflow-hidden rounded-lg border">
                      <img
                        src={result.openGraph.image}
                        alt="OG Preview"
                        className="h-40 w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">OG Title</label>
                  <Input
                    value={result.openGraph.title || 'Not set'}
                    readOnly
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    OG Description
                  </label>
                  <Textarea
                    value={result.openGraph.description || 'Not set'}
                    readOnly
                    className="bg-neutral-50"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">OG Type</label>
                    <Input
                      value={result.openGraph.type || 'Not set'}
                      readOnly
                      className="bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Site Name
                    </label>
                    <Input
                      value={result.openGraph.siteName || 'Not set'}
                      readOnly
                      className="bg-neutral-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Twitter Cards */}
            <Card>
              <CardHeader>
                <CardTitle>Twitter Card Tags</CardTitle>
                <CardDescription>Twitter/X sharing preview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Card Type</label>
                    <Input
                      value={result.twitter.card || 'Not set'}
                      readOnly
                      className="bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Twitter Site
                    </label>
                    <Input
                      value={result.twitter.site || 'Not set'}
                      readOnly
                      className="bg-neutral-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Twitter Title
                  </label>
                  <Input
                    value={result.twitter.title || 'Not set'}
                    readOnly
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Twitter Description
                  </label>
                  <Textarea
                    value={result.twitter.description || 'Not set'}
                    readOnly
                    className="bg-neutral-50"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Meta Tag Planner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meta Tag Planner</CardTitle>
                    <CardDescription>
                      Plan optimised meta tags for this page
                    </CardDescription>
                  </div>
                  <Button
                    variant={plannerMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPlannerMode(!plannerMode)}
                  >
                    {plannerMode ? 'View Mode' : 'Edit Mode'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium">Planned Title</label>
                    <span
                      className={`text-xs ${
                        titleLength > 60
                          ? 'text-red-500'
                          : titleLength > 50
                          ? 'text-amber-500'
                          : 'text-green-500'
                      }`}
                    >
                      {titleLength}/60 characters
                    </span>
                  </div>
                  <Input
                    value={plannedTitle}
                    onChange={(e) => setPlannedTitle(e.target.value)}
                    readOnly={!plannerMode}
                    className={!plannerMode ? 'bg-neutral-50' : ''}
                    placeholder="Enter optimised title..."
                  />
                  {plannerMode && (
                    <div className="mt-2 h-2 rounded-full bg-neutral-200">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          titleLength > 60
                            ? 'bg-red-500'
                            : titleLength > 50
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((titleLength / 60) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Planned Description
                    </label>
                    <span
                      className={`text-xs ${
                        descriptionLength > 160
                          ? 'text-red-500'
                          : descriptionLength > 140
                          ? 'text-amber-500'
                          : 'text-green-500'
                      }`}
                    >
                      {descriptionLength}/160 characters
                    </span>
                  </div>
                  <Textarea
                    value={plannedDescription}
                    onChange={(e) => setPlannedDescription(e.target.value)}
                    readOnly={!plannerMode}
                    className={!plannerMode ? 'bg-neutral-50' : ''}
                    rows={4}
                    placeholder="Enter optimised description..."
                  />
                  {plannerMode && (
                    <div className="mt-2 h-2 rounded-full bg-neutral-200">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          descriptionLength > 160
                            ? 'bg-red-500'
                            : descriptionLength > 140
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((descriptionLength / 160) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                {plannerMode && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        copyToClipboard(
                          `Title: ${plannedTitle}\nDescription: ${plannedDescription}`
                        );
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All
                    </Button>
                    <Button className="flex-1">
                      <Save className="mr-2 h-4 w-4" />
                      Save Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Other Meta Tags */}
          {result.other.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Other Meta Tags</CardTitle>
                <CardDescription>
                  Additional meta tags found on the page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {result.other.map((tag, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <p className="text-xs font-medium text-neutral-500">
                        {tag.name}
                      </p>
                      <p className="mt-1 truncate text-sm text-neutral-700">
                        {tag.content}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
