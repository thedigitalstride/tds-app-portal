'use client';

import { StageJourneyNode } from './StageJourneyNode';
import {
  STAGE_ORDER,
  STAGE_CONFIG,
  STAGE_SHORT_LABELS,
  type IdeaStage,
  type IStageData,
} from './types';

interface StageJourneyProps {
  currentStage: IdeaStage;
  stages: Record<IdeaStage, IStageData>;
  onStageClick: (stage: IdeaStage) => void;
  stageReadiness: number;
  nextStage: IdeaStage | null;
  onAdvanceStage: () => void;
  onGeneratePrd: () => void;
  sending: boolean;
  hasPrdContent: boolean;
}

function StageConnector({
  fromStage,
  completed,
}: {
  fromStage: IdeaStage;
  completed: boolean;
}) {
  const config = STAGE_CONFIG[fromStage];
  const nextIndex = STAGE_ORDER.indexOf(fromStage) + 1;
  const nextConfig = nextIndex < STAGE_ORDER.length ? STAGE_CONFIG[STAGE_ORDER[nextIndex]] : null;

  return (
    <div className="relative h-0.5 w-3 sm:w-6 shrink-0">
      {/* Track */}
      <div className="absolute inset-0 rounded-full bg-neutral-200" />
      {/* Filled overlay */}
      {completed && nextConfig && (
        <div
          className="animate-connector-fill absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${config.primary}, ${nextConfig.primary})`,
          }}
        />
      )}
    </div>
  );
}

export function StageJourney({
  currentStage,
  stages,
  onStageClick,
  stageReadiness,
  nextStage,
  onAdvanceStage,
  onGeneratePrd,
  sending,
  hasPrdContent,
}: StageJourneyProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const currentConfig = STAGE_CONFIG[currentStage];

  return (
    <div
      className="relative flex items-center gap-0.5 sm:gap-1 overflow-x-auto py-1"
      style={{
        borderBottom: `2px solid ${currentConfig.primary}20`,
      }}
    >
      {STAGE_ORDER.map((stage, index) => {
        const isComplete = stages[stage]?.isComplete;
        const isCurrent = stage === currentStage;
        const isAccessible =
          index <= currentIndex ||
          isComplete ||
          (stages[stage]?.messages?.length ?? 0) > 0;

        let state: 'current' | 'completed' | 'inaccessible';
        if (isCurrent) state = 'current';
        else if (isComplete) state = 'completed';
        else if (isAccessible) state = 'completed'; // navigable past stages shown as completed
        else state = 'inaccessible';

        return (
          <div key={stage} className="flex items-center">
            {index > 0 && (
              <StageConnector
                fromStage={STAGE_ORDER[index - 1]}
                completed={index <= currentIndex}
              />
            )}
            <StageJourneyNode
              stage={stage}
              state={state}
              stageReadiness={isCurrent ? stageReadiness : 0}
              canAdvance={isCurrent && nextStage !== null}
              nextStageLabel={nextStage ? STAGE_SHORT_LABELS[nextStage] : null}
              isPrd={stage === 'prd'}
              hasPrdContent={hasPrdContent}
              sending={sending}
              onClick={() => isAccessible && onStageClick(stage)}
              onAdvance={onAdvanceStage}
              onGeneratePrd={onGeneratePrd}
            />
          </div>
        );
      })}
    </div>
  );
}
