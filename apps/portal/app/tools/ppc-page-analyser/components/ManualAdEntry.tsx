'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from '@tds/ui';
import { HeadlineInput } from './HeadlineInput';
import { DescriptionInput } from './DescriptionInput';
import { KeywordInput } from './KeywordInput';
import { AIProviderSelector } from './AIProviderSelector';
import { AnalysisFocusSelector } from './AnalysisFocusSelector';
import { InfoTooltip } from './InfoTooltip';

type AIProvider = 'claude' | 'openai';
type AnalysisFocus = 'general' | 'ecommerce' | 'leadgen' | 'b2b';

interface Headline {
  text: string;
  pinnedPosition?: 1 | 2 | 3;
}

interface Description {
  text: string;
  pinnedPosition?: 1 | 2;
}

interface Keyword {
  text: string;
  matchType: 'exact' | 'phrase' | 'broad';
}

interface AdData {
  headlines: Headline[];
  descriptions: Description[];
  keywords: Keyword[];
}

interface ManualAdEntryProps {
  clientId: string;
  onAnalysisComplete: (analysisId: string) => void;
  onCancel: () => void;
}

const MIN_HEADLINES = 3;
const MAX_HEADLINES = 15;
const MIN_DESCRIPTIONS = 2;
const MAX_DESCRIPTIONS = 4;
const MIN_KEYWORDS = 1;

export function ManualAdEntry({
  clientId,
  onAnalysisComplete,
  onCancel,
}: ManualAdEntryProps) {
  // URL state
  const [url, setUrl] = useState('');

  // Ad data state
  const [headlines, setHeadlines] = useState<Headline[]>([
    { text: '' },
    { text: '' },
    { text: '' },
  ]);
  const [descriptions, setDescriptions] = useState<Description[]>([
    { text: '' },
    { text: '' },
  ]);
  const [keywords, setKeywords] = useState<Keyword[]>([
    { text: '', matchType: 'broad' },
  ]);

  // AI settings state
  const [aiProvider, setAiProvider] = useState<AIProvider>('claude');
  const [aiModel, setAiModel] = useState('claude-sonnet-4-20250514');
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus>('general');
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check available AI providers on mount
  useEffect(() => {
    async function checkProviders() {
      try {
        const res = await fetch('/api/tools/ppc-page-analyser/analyze-ai');
        if (res.ok) {
          const data = await res.json();
          const providers = data.providers || [];
          setAvailableProviders(providers);
          // Set provider to first available if current provider isn't available
          if (providers.length > 0) {
            setAiProvider((current) => {
              if (!providers.includes(current)) {
                const newProvider = providers[0];
                setAiModel(
                  newProvider === 'claude'
                    ? 'claude-sonnet-4-20250514'
                    : 'gpt-4o'
                );
                return newProvider;
              }
              return current;
            });
          }
        }
      } catch (err) {
        console.error('Failed to check AI providers:', err);
      }
    }
    checkProviders();
  }, []);

  // Headline handlers
  const updateHeadline = (index: number, updates: Partial<Headline>) => {
    setHeadlines((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...updates } : h))
    );
  };

  const addHeadline = () => {
    if (headlines.length < MAX_HEADLINES) {
      setHeadlines((prev) => [...prev, { text: '' }]);
    }
  };

  const removeHeadline = (index: number) => {
    if (headlines.length > MIN_HEADLINES) {
      setHeadlines((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Description handlers
  const updateDescription = (index: number, updates: Partial<Description>) => {
    setDescriptions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  };

  const addDescription = () => {
    if (descriptions.length < MAX_DESCRIPTIONS) {
      setDescriptions((prev) => [...prev, { text: '' }]);
    }
  };

  const removeDescription = (index: number) => {
    if (descriptions.length > MIN_DESCRIPTIONS) {
      setDescriptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Keyword handlers
  const updateKeyword = (index: number, updates: Partial<Keyword>) => {
    setKeywords((prev) =>
      prev.map((k, i) => (i === index ? { ...k, ...updates } : k))
    );
  };

  const addKeyword = () => {
    setKeywords((prev) => [...prev, { text: '', matchType: 'broad' }]);
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > MIN_KEYWORDS) {
      setKeywords((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Validation
  const isValid = () => {
    if (!url.trim()) return false;
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

    const filledHeadlines = headlines.filter((h) => h.text.trim()).length;
    if (filledHeadlines < MIN_HEADLINES) return false;

    const filledDescriptions = descriptions.filter((d) => d.text.trim()).length;
    if (filledDescriptions < MIN_DESCRIPTIONS) return false;

    const filledKeywords = keywords.filter((k) => k.text.trim()).length;
    if (filledKeywords < MIN_KEYWORDS) return false;

    return availableProviders.length > 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!isValid()) return;

    setIsLoading(true);
    setError(null);

    try {
      const adData: AdData = {
        headlines: headlines.filter((h) => h.text.trim()),
        descriptions: descriptions.filter((d) => d.text.trim()),
        keywords: keywords.filter((k) => k.text.trim()),
      };

      const res = await fetch('/api/tools/ppc-page-analyser/analyze-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          url: url.trim(),
          adData,
          aiProvider,
          aiModel,
          analysisFocus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await res.json();
      onAnalysisComplete(data.analysis._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Landing Page URL
        </label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/landing-page"
          type="url"
        />
      </div>

      {/* Headlines Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1">
            Headlines ({headlines.filter((h) => h.text.trim()).length}/{MIN_HEADLINES} min)
            <InfoTooltip tooltipKey="pinnedPosition" iconOnly size="xs" />
          </label>
          {headlines.length < MAX_HEADLINES && (
            <Button variant="ghost" size="sm" onClick={addHeadline}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {headlines.map((headline, index) => (
            <HeadlineInput
              key={index}
              index={index}
              value={headline.text}
              pinnedPosition={headline.pinnedPosition}
              onChange={(text) => updateHeadline(index, { text })}
              onPinnedChange={(pinnedPosition) =>
                updateHeadline(index, { pinnedPosition })
              }
              onRemove={() => removeHeadline(index)}
              canRemove={headlines.length > MIN_HEADLINES}
            />
          ))}
        </div>
      </div>

      {/* Descriptions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-neutral-700">
            Descriptions ({descriptions.filter((d) => d.text.trim()).length}/{MIN_DESCRIPTIONS} min)
          </label>
          {descriptions.length < MAX_DESCRIPTIONS && (
            <Button variant="ghost" size="sm" onClick={addDescription}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {descriptions.map((description, index) => (
            <DescriptionInput
              key={index}
              index={index}
              value={description.text}
              pinnedPosition={description.pinnedPosition}
              onChange={(text) => updateDescription(index, { text })}
              onPinnedChange={(pinnedPosition) =>
                updateDescription(index, { pinnedPosition })
              }
              onRemove={() => removeDescription(index)}
              canRemove={descriptions.length > MIN_DESCRIPTIONS}
            />
          ))}
        </div>
      </div>

      {/* Keywords Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1">
            Target Keywords ({keywords.filter((k) => k.text.trim()).length}/{MIN_KEYWORDS} min)
            <InfoTooltip tooltipKey="matchTypeBroad" iconOnly size="xs" />
          </label>
          <Button variant="ghost" size="sm" onClick={addKeyword}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {keywords.map((keyword, index) => (
            <KeywordInput
              key={index}
              index={index}
              text={keyword.text}
              matchType={keyword.matchType}
              onTextChange={(text) => updateKeyword(index, { text })}
              onMatchTypeChange={(matchType) =>
                updateKeyword(index, { matchType })
              }
              onRemove={() => removeKeyword(index)}
              canRemove={keywords.length > MIN_KEYWORDS}
            />
          ))}
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
      >
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        AI Settings
        <InfoTooltip tooltipKey="aiProvider" iconOnly size="xs" asSpan />
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card className="p-4 space-y-4 bg-neutral-50">
          <AIProviderSelector
            provider={aiProvider}
            model={aiModel}
            availableProviders={availableProviders}
            onProviderChange={setAiProvider}
            onModelChange={setAiModel}
          />
          <AnalysisFocusSelector focus={analysisFocus} onChange={setAnalysisFocus} />
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid() || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analysing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Run AI Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
