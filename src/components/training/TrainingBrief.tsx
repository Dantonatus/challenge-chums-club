import { cn } from '@/lib/utils';
import { TrendingUp, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface TrainingBriefChip {
  label: string;
  value: string;
}

export interface TrainingBriefData {
  headline: string;
  explanation: string;
  tone: 'positive' | 'watch' | 'neutral' | 'primary';
  chips: TrainingBriefChip[];
  action?: string;
}

interface Props {
  brief: TrainingBriefData;
}

const TONE = {
  primary: { Icon: TrendingUp, ring: 'text-health-observed' },
  positive: { Icon: CheckCircle2, ring: 'text-health-positive' },
  watch: { Icon: AlertTriangle, ring: 'text-health-warning' },
  neutral: { Icon: Target, ring: 'text-health-ink-muted' },
} as const;

export function TrainingBrief({ brief }: Props) {
  const { Icon, ring } = TONE[brief.tone];
  return (
    <section
      aria-labelledby="training-brief-title"
      className="rounded-2xl border border-health-hairline bg-health-surface p-5 shadow-health-soft sm:p-6"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-health-ink-subtle">
        Executive Brief
      </div>
      <div className="flex items-start gap-4">
        <div className={cn('mt-0.5 flex-shrink-0', ring)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="training-brief-title"
            className="font-health text-xl font-semibold leading-tight text-health-ink sm:text-2xl"
          >
            {brief.headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-health-ink-muted">{brief.explanation}</p>

          {brief.chips.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-2">
              {brief.chips.map((c) => (
                <div
                  key={c.label}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-health-hairline bg-health-canvas/50 px-3 py-1 text-xs"
                >
                  <dt className="text-health-ink-subtle">{c.label}</dt>
                  <dd className="font-medium tabular-nums text-health-ink">{c.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {brief.action && (
            <div className="mt-4 rounded-xl border border-dashed border-health-hairline bg-health-canvas/30 px-4 py-3 text-sm text-health-ink">
              <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-health-ink-subtle">
                Nächste Handlung
              </span>
              {brief.action}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
