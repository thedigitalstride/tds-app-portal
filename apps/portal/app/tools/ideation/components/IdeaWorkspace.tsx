'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Check, X, MoreVertical, Loader2 } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@tds/ui';
import { useIdea } from '../hooks/useIdea';
import { useConversation } from '../hooks/useConversation';
import { StageJourney } from './StageJourney';
import { ConversationPanel } from './ConversationPanel';
import { PrdPreview } from './PrdPreview';
import { IdeaScoreCard } from './IdeaScoreCard';
import { CommentThread } from './CommentThread';
import { VoteButton } from './VoteButton';
import { StatusBadge } from './StatusBadge';
import {
  STAGE_ORDER,
  STATUS_LABELS,
  type IdeaStage,
  type IdeaStatus,
  type IIdeaMessage,
  type IAttachment,
  type PrdValidationInfo,
} from './types';

interface IdeaWorkspaceProps {
  ideaId: string;
  currentUserId: string;
}

export function IdeaWorkspace({ ideaId, currentUserId }: IdeaWorkspaceProps) {
  const router = useRouter();
  const {
    idea,
    loading,
    error,
    refreshIdea,
    updateTitle,
    updateStatus,
    deleteIdea,
    exportPrd,
    score,
    vote,
    addComment,
  } = useIdea(ideaId);

  const { sending, stageReadiness, setStageReadiness, sendMessage, uploadFiles, undoLastExchange, advanceStage, generatePrd } =
    useConversation(ideaId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [scoring, setScoring] = useState(false);
  const [prdValidation, setPrdValidation] = useState<PrdValidationInfo | null>(null);

  const currentStage = idea?.currentStage as IdeaStage | undefined;
  const currentStageIndex = currentStage ? STAGE_ORDER.indexOf(currentStage) : 0;
  const nextStage = currentStageIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentStageIndex + 1] : null;

  // Get messages for current stage
  const currentMessages: IIdeaMessage[] = useMemo(() => {
    if (!idea || !currentStage) return [];
    return idea.stages[currentStage]?.messages || [];
  }, [idea, currentStage]);

  // Get last options from the latest assistant message
  const lastOptions = useMemo(() => {
    const lastAssistant = [...currentMessages].reverse().find((m) => m.role === 'assistant');
    return lastAssistant?.options;
  }, [currentMessages]);

  // Calculate stageReadiness from extractedData on mount
  useEffect(() => {
    if (!idea || !currentStage) return;
    const stageData = idea.stages[currentStage];
    const dataKeys = Object.keys(stageData?.extractedData || {});
    const readiness = Math.min(dataKeys.length * 20, 80);
    setStageReadiness(readiness);
  }, [idea, currentStage, setStageReadiness]);

  const handleUndoLastExchange = useCallback(async () => {
    const success = await undoLastExchange();
    if (success) refreshIdea();
  }, [undoLastExchange, refreshIdea]);

  const handleSendMessage = useCallback(
    async (content: string, selectedOptionId?: string, attachments?: IAttachment[]) => {
      const response = await sendMessage(content, selectedOptionId, attachments);
      if (response?.suggestedTitle && idea?.title === 'Untitled Idea') {
        refreshIdea();
      } else {
        refreshIdea();
      }
    },
    [sendMessage, idea?.title, refreshIdea]
  );

  const handleStageClick = useCallback(
    async (stage: IdeaStage) => {
      if (stage === currentStage) return;
      const success = await advanceStage(stage);
      if (success) refreshIdea();
    },
    [currentStage, advanceStage, refreshIdea]
  );

  const handleAdvanceStage = useCallback(async () => {
    if (!nextStage) return;
    const success = await advanceStage(nextStage);
    if (success) refreshIdea();
  }, [nextStage, advanceStage, refreshIdea]);

  const handleGeneratePrd = useCallback(async () => {
    const result = await generatePrd();
    if (result) {
      setPrdValidation(result.validation ?? null);
      refreshIdea();
    }
  }, [generatePrd, refreshIdea]);

  const handleScore = useCallback(async () => {
    setScoring(true);
    try {
      await score();
    } finally {
      setScoring(false);
    }
  }, [score]);

  const handleTitleSave = useCallback(async () => {
    if (titleDraft.trim()) {
      await updateTitle(titleDraft.trim());
    }
    setEditingTitle(false);
  }, [titleDraft, updateTitle]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this idea? This cannot be undone.')) return;
    await deleteIdea();
    router.push('/tools/ideation');
  }, [deleteIdea, router]);

  const userVote = useMemo(() => {
    const v = idea?.votes?.find((v) => v.userId === currentUserId);
    return v ? (v.value as 1 | -1) : null;
  }, [idea?.votes, currentUserId]);

  // Extract structured PRD data (hooks must be before early returns)
  const prdExtracted = idea?.stages.prd?.extractedData as Record<string, unknown> | undefined;
  const prdData = useMemo(() => {
    if (!idea) return null;
    if (!prdExtracted) {
      const rawContent = idea.stages.prd?.messages?.find((m) => m.role === 'assistant')?.content;
      if (!rawContent) return null;
      return { fullMarkdown: rawContent } as import('./types').IPrdData;
    }
    return prdExtracted as unknown as import('./types').IPrdData;
  }, [idea, prdExtracted]);

  const hasPrdContent = !!prdData;

  const handleExportPdf = useCallback(async () => {
    if (!prdData || !idea) return;
    const { pdf } = await import('@react-pdf/renderer');
    const { PrdPdfDocument } = await import('./prd/PrdPdfDocument');
    const blob = await pdf(
      PrdPdfDocument({
        prdData,
        ideaTitle: idea.title,
        ideaStatus: idea.status as import('./types').IdeaStatus,
        scoring: idea.scoring,
        updatedAt: idea.updatedAt,
      })
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${idea.title || 'prd'}-prd.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [prdData, idea]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-neutral-500">{error || 'Idea not found'}</p>
        <Button variant="outline" onClick={() => router.push('/tools/ideation')}>
          Back to pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => router.push('/tools/ideation')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            {editingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                  className="rounded border border-neutral-300 px-2 py-1 text-sm"
                />
                <Button variant="ghost" size="sm" onClick={handleTitleSave}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingTitle(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTitleDraft(idea.title);
                  setEditingTitle(true);
                }}
                className="group flex items-center gap-1.5 truncate"
              >
                <h1 className="truncate text-lg font-semibold text-neutral-900">
                  {idea.title}
                </h1>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-neutral-300 group-hover:text-neutral-500" />
              </button>
            )}

            <StatusBadge status={idea.status} />
          </div>

          <div className="flex items-center gap-2">
            <VoteButton
              voteScore={idea.voteScore}
              userVote={userVote}
              onVote={vote}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['draft', 'approved', 'in-progress', 'completed', 'archived'] as IdeaStatus[]).map(
                  (s) =>
                    s !== idea.status && (
                      <DropdownMenuItem key={s} onClick={() => updateStatus(s)}>
                        Move to {STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    )
                )}
                <DropdownMenuItem onClick={handleScore}>
                  {scoring ? 'Scoring...' : 'Score Idea'}
                </DropdownMenuItem>
                {hasPrdContent && (
                  <DropdownMenuItem onClick={exportPrd}>Export PRD</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  Delete Idea
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stage Journey */}
        <div className="mt-3">
          <StageJourney
            currentStage={currentStage!}
            stages={idea.stages}
            onStageClick={handleStageClick}
            stageReadiness={stageReadiness}
            nextStage={nextStage}
            onAdvanceStage={handleAdvanceStage}
            onGeneratePrd={handleGeneratePrd}
            sending={sending}
            hasPrdContent={hasPrdContent}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation */}
        <div className="flex-1">
          {currentStage === 'prd' && prdData ? (
            <div className="h-full overflow-hidden">
              <PrdPreview
                prdData={prdData}
                ideaTitle={idea.title}
                ideaStatus={idea.status as import('./types').IdeaStatus}
                updatedAt={idea.updatedAt}
                scoring={idea.scoring}
                onExport={exportPrd}
                onExportPdf={handleExportPdf}
                onRegenerate={handleGeneratePrd}
                regenerating={sending}
                validationInfo={prdValidation}
              />
            </div>
          ) : (
            <ConversationPanel
              messages={currentMessages}
              onSendMessage={handleSendMessage}
              onUploadFiles={uploadFiles}
              onUndoLastExchange={handleUndoLastExchange}
              sending={sending}
              lastOptions={lastOptions}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden w-80 shrink-0 overflow-y-auto border-l border-neutral-200 bg-neutral-50 p-4 lg:block">
          <div className="space-y-4">
            <IdeaScoreCard scoring={idea.scoring} onScore={handleScore} loading={scoring} />
            <CommentThread comments={idea.comments || []} onAddComment={addComment} />
          </div>
        </div>
      </div>
    </div>
  );
}
