import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { BodyScanInsight } from '@/lib/bodyscan/analytics';

const TONE = {
  primary: { Icon: TrendingUp, ring: 'text-health-observed' },
  positive: { Icon: CheckCircle2, ring: 'text-health-positive' },
  watch: { Icon: AlertTriangle, ring: 'text-health-warning' },
  neutral: { Icon: Info, ring: 'text-health-ink-muted' },
} as const;

interface Props {
  insight: BodyScanInsight;
  baselineLabel: string;
}

export function RecompositionBrief({ insight, baselineLabel }: Props) {
  const { Icon, ring } = TONE[insight.tone];
  return (
    <section
      aria-labelledby="recomp-brief-title"
      className="rounded-2xl border border-health-hairline bg-health-surface p-5 shadow-health-soft sm:p-6"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-health-ink-subtle">
          {insight.eyebrow}
        </div>
        <div className="text-[10px] font-medium text-health-ink-subtle">{baselineLabel}</div>
      </div>
      <div className="flex items-start gap-4">
        <div className={cn('mt-0.5 flex-shrink-0', ring)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="recomp-brief-title"
            className="font-health text-xl font-semibold leading-tight text-health-ink sm:text-2xl"
          >
            {insight.headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-health-ink-muted">{insight.explanation}</p>

          {insight.evidence.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-2">
              {insight.evidence.map((e) => (
                <div
                  key={e.label}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-health-hairline bg-health-canvas/50 px-3 py-1 text-xs"
                >
                  <dt className="text-health-ink-subtle">{e.label}</dt>
                  <dd className="font-medium tabular-nums text-health-ink">{e.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
