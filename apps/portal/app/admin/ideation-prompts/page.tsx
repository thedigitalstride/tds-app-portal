'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RotateCcw, Save, ChevronDown, ChevronRight, Check } from 'lucide-react';
import {
  cn,
  Button,
  Badge,
  Textarea,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@tds/ui';

interface PromptInfo {
  key: string;
  defaultContent: string;
  overrideContent: string | null;
  isOverridden: boolean;
  updatedAt: string | null;
}

const PROMPT_META: Record<string, { name: string; description: string; group: string }> = {
  'system-base': { name: 'System Base', description: 'Core persona and response format rules', group: 'Core' },
  seed: { name: 'Seed Stage', description: 'Stage 1 — understand the raw idea', group: 'Stages' },
  shape: { name: 'Shape & Scope', description: 'Stage 2 — define boundaries and scope', group: 'Stages' },
  research: { name: 'Research & Validate', description: 'Stage 3 — market research and validation', group: 'Stages' },
  refine: { name: 'Refine & Prioritise', description: 'Stage 4 — prioritise features and refine', group: 'Stages' },
  prd: { name: 'Generate PRD', description: 'Stage 5 — produce the final PRD document', group: 'Stages' },
  scoring: { name: 'Idea Scoring', description: 'Viability, uniqueness, and effort assessment', group: 'Utility' },
  inspiration: { name: 'Inspiration', description: 'Generate creative idea seeds', group: 'Utility' },
};

const GROUPS = ['Core', 'Stages', 'Utility'];

export default function AdminIdeationPromptsPage() {
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDefaultPreview, setShowDefaultPreview] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dirtyRef = useRef(false);
  const [, forceUpdate] = useState(0);

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ideation-prompts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPrompts(data.prompts);
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const selectedPrompt = prompts.find((p) => p.key === selectedKey);

  const currentContent = selectedPrompt
    ? selectedPrompt.overrideContent ?? selectedPrompt.defaultContent
    : '';

  const isDirty = dirtyRef.current;

  const handleSelectPrompt = (key: string) => {
    if (isDirty && selectedKey && key !== selectedKey) {
      const discard = window.confirm('You have unsaved changes. Discard them?');
      if (!discard) return;
    }
    setSelectedKey(key);
    const prompt = prompts.find((p) => p.key === key);
    if (prompt) {
      const content = prompt.overrideContent ?? prompt.defaultContent;
      setEditorContent(content);
      dirtyRef.current = false;
      forceUpdate((n) => n + 1);
    }
    setShowDefaultPreview(false);
    setSaveSuccess(false);
  };

  const handleEditorChange = (value: string) => {
    setEditorContent(value);
    dirtyRef.current = value !== currentContent;
    forceUpdate((n) => n + 1);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedKey || !isDirty) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/ideation-prompts/${selectedKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent }),
      });
      if (!res.ok) throw new Error('Failed to save');
      dirtyRef.current = false;
      forceUpdate((n) => n + 1);
      setSaveSuccess(true);
      await fetchPrompts();
    } catch (error) {
      console.error('Failed to save override:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedKey) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/ideation-prompts/${selectedKey}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to reset');
      const data = await res.json();
      setEditorContent(data.defaultContent);
      dirtyRef.current = false;
      forceUpdate((n) => n + 1);
      setShowResetDialog(false);
      setSaveSuccess(false);
      await fetchPrompts();
    } catch (error) {
      console.error('Failed to reset override:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-6">
          <div className="w-80 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <Skeleton className="flex-1 h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
            <Sparkles className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Ideation Prompts</h1>
            <p className="text-sm text-neutral-500">
              Customise the AI prompts used by the ideation tool. Overrides replace the default entirely.
            </p>
          </div>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Left panel — prompt list */}
        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-5">
          {GROUPS.map((group) => {
            const groupPrompts = prompts.filter(
              (p) => PROMPT_META[p.key]?.group === group
            );
            if (groupPrompts.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="text-xs font-semibold uppercase text-neutral-400 mb-2 px-1">
                  {group}
                </h3>
                <div className="space-y-1">
                  {groupPrompts.map((prompt) => {
                    const meta = PROMPT_META[prompt.key];
                    const isSelected = selectedKey === prompt.key;
                    return (
                      <button
                        key={prompt.key}
                        onClick={() => handleSelectPrompt(prompt.key)}
                        className={cn(
                          'w-full text-left rounded-lg px-3 py-2.5 transition-colors',
                          isSelected
                            ? 'bg-violet-50 border border-violet-200'
                            : 'hover:bg-neutral-100 border border-transparent'
                        )}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isSelected ? 'text-violet-900' : 'text-neutral-900'
                            )}
                          >
                            {meta?.name ?? prompt.key}
                          </span>
                          <Badge
                            variant={prompt.isOverridden ? 'default' : 'secondary'}
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              prompt.isOverridden
                                ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                                : ''
                            )}
                          >
                            {prompt.isOverridden ? 'Customised' : 'Default'}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {meta?.description ?? ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right panel — editor */}
        <div className="flex-1 min-w-0 flex flex-col">
          {!selectedPrompt ? (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
              Select a prompt from the left to begin editing
            </div>
          ) : (
            <>
              {/* Editor header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {PROMPT_META[selectedPrompt.key]?.name}
                    </h2>
                    <Badge
                      variant={selectedPrompt.isOverridden ? 'default' : 'secondary'}
                      className={cn(
                        selectedPrompt.isOverridden
                          ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                          : ''
                      )}
                    >
                      {selectedPrompt.isOverridden ? 'Customised' : 'Default'}
                    </Badge>
                  </div>
                  {selectedPrompt.isOverridden && selectedPrompt.updatedAt && (
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Last modified{' '}
                      {new Date(selectedPrompt.updatedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedPrompt.isOverridden && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetDialog(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset to Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {saving ? (
                      'Saving...'
                    ) : saveSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save Override
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* View Default toggle */}
              <button
                onClick={() => setShowDefaultPreview(!showDefaultPreview)}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 mb-3 transition-colors"
              >
                {showDefaultPreview ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                View Default Prompt
              </button>
              {showDefaultPreview && (
                <pre className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 font-mono whitespace-pre-wrap">
                  {selectedPrompt.defaultContent}
                </pre>
              )}

              {/* Editor */}
              <Textarea
                value={editorContent}
                onChange={(e) => handleEditorChange(e.target.value)}
                className="flex-1 min-h-[400px] font-mono text-sm resize-y"
                placeholder="Enter prompt content..."
              />

              {/* Character count */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-neutral-400">
                  {editorContent.length.toLocaleString()} characters
                </span>
                {isDirty && (
                  <span className="text-xs text-amber-600 font-medium">
                    Unsaved changes
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Default?</DialogTitle>
            <DialogDescription>
              This will remove your custom override for{' '}
              <strong>{PROMPT_META[selectedKey ?? '']?.name}</strong> and restore the
              hardcoded default. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? 'Resetting...' : 'Reset to Default'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
