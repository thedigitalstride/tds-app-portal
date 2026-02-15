import {
  STAGE_ORDER,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  STAGE_CONFIG,
} from '../components/types';

export function StageWalkthrough() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {STAGE_ORDER.map((stage, i) => {
        const config = STAGE_CONFIG[stage];
        const Icon = config.icon;
        const desc = STAGE_DESCRIPTIONS[stage];

        return (
          <div
            key={stage}
            className="rounded-xl border p-5"
            style={{
              borderColor: `${config.primary}33`,
              backgroundColor: config.lightBg,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Gradient icon circle */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})`,
                }}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: config.primary }}
                  >
                    Stage {i + 1}
                  </span>
                </div>
                <h3 className="mt-0.5 font-semibold text-neutral-900">
                  {STAGE_LABELS[stage]}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                  {desc.description}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  <span className="font-medium text-neutral-700">You&apos;ll have:</span>{' '}
                  {desc.outcome}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
