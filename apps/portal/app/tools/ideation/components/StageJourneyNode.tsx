'use client';

import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { StageProgressRing } from './StageProgressRing';
import {
  STAGE_CONFIG,
  STAGE_ORDER,
  STAGE_SHORT_LABELS,
  type IdeaStage,
  type StageConfig,
} from './types';

type NodeState = 'current' | 'completed' | 'inaccessible';

interface StageJourneyNodeProps {
  stage: IdeaStage;
  state: NodeState;
  stageReadiness: number;
  canAdvance: boolean;
  nextStageLabel: string | null;
  isPrd: boolean;
  hasPrdContent: boolean;
  sending: boolean;
  onClick: () => void;
  onAdvance: () => void;
  onGeneratePrd: () => void;
}

export function StageJourneyNode({
  stage,
  state,
  stageReadiness,
  canAdvance,
  nextStageLabel,
  isPrd,
  hasPrdContent,
  sending,
  onClick,
  onAdvance,
  onGeneratePrd,
}: StageJourneyNodeProps) {
  const config: StageConfig = STAGE_CONFIG[stage];
  const Icon = config.icon;
  const label = STAGE_SHORT_LABELS[stage];

  // Current stage: expanded with progress ring
  if (state === 'current') {
    const readyToAdvance = canAdvance && stageReadiness >= 80;
    const showPrdAction = isPrd && !hasPrdContent;
    const progressColor = stageReadiness >= 80 ? '#22c55e' : config.primary;

    // Look up the next stage's config for the advance button colour
    const stageIndex = STAGE_ORDER.indexOf(stage);
    const nextStage = stageIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[stageIndex + 1] : null;
    const nextConfig = nextStage ? STAGE_CONFIG[nextStage] : null;

    return (
      <div className="flex items-center gap-1.5">
        {/* Stage status pill — always a passive indicator */}
        <div
          className="animate-stage-breathe flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-white sm:gap-2.5 sm:py-2 sm:pl-2 sm:pr-4"
          style={{
            background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})`,
            '--stage-shadow': `${config.primary}40`,
          } as React.CSSProperties}
        >
          <StageProgressRing
            progress={stageReadiness}
            size={32}
            strokeWidth={3}
            trackColor="rgba(255,255,255,0.25)"
            fillColor={progressColor}
            glowColor={readyToAdvance ? '#22c55e80' : `${config.accent}80`}
            ready={readyToAdvance || showPrdAction}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Icon className="h-4 w-4 text-white" />
            )}
          </StageProgressRing>

          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold sm:text-sm">{label}</span>
            <span className="hidden text-[10px] opacity-75 sm:block">
              {stageReadiness}% ready
            </span>
          </div>
        </div>

        {/* Advance button — glowing CTA using next stage's colour */}
        {readyToAdvance && !sending && nextStageLabel && nextConfig && (
          <button
            onClick={onAdvance}
            className="animate-advance-enter -ml-1 flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-3.5 text-xs font-semibold text-white transition-all hover:scale-105 hover:brightness-110 sm:py-2 sm:pl-4 sm:pr-5 sm:text-sm"
            style={{
              background: `linear-gradient(135deg, ${nextConfig.gradientFrom}, ${nextConfig.gradientTo})`,
              '--advance-glow': nextConfig.accent,
            } as React.CSSProperties}
          >
            <span>{nextStageLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 animate-advance-arrow sm:h-4 sm:w-4" />
          </button>
        )}

        {/* Generate PRD button — glowing CTA using PRD stage's colour */}
        {showPrdAction && !sending && (
          <button
            onClick={onGeneratePrd}
            className="animate-advance-enter -ml-1 flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-3.5 text-xs font-semibold text-white transition-all hover:scale-105 hover:brightness-110 sm:py-2 sm:pl-4 sm:pr-5 sm:text-sm"
            style={{
              background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})`,
              '--advance-glow': config.accent,
            } as React.CSSProperties}
          >
            <span>Generate</span>
            <Sparkles className="h-3.5 w-3.5 animate-advance-arrow sm:h-4 sm:w-4" />
          </button>
        )}
      </div>
    );
  }

  // Completed stage
  if (state === 'completed') {
    return (
      <button
        onClick={onClick}
        className="group relative flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:brightness-95 sm:px-2.5 sm:py-2"
        style={{ backgroundColor: config.lightBg }}
      >
        <Icon className="h-4 w-4" style={{ color: config.primary }} />
        <span
          className="hidden text-xs font-medium sm:inline"
          style={{ color: config.primary }}
        >
          {label}
        </span>
        <div
          className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500"
        >
          <Check className="h-2 w-2 text-white" strokeWidth={3} />
        </div>
      </button>
    );
  }

  // Inaccessible stage
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-1.5 opacity-50 sm:px-2.5 sm:py-2 cursor-not-allowed">
      <Icon className="h-4 w-4 text-neutral-400" />
      <span className="hidden text-xs font-medium text-neutral-400 sm:inline">
        {label}
      </span>
    </div>
  );
}
