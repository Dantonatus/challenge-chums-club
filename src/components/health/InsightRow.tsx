import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, TrendingUp, Circle } from 'lucide-react';
import type { Insight } from '@/lib/health/executiveInsights';

interface Props {
  insight: Insight;
  compact?: boolean;
  onAction?: (insight: Insight) => void;
}

const PRIORITY_META = {
  primary: { icon: TrendingUp, tone: 'text-health-observed', bar: 'bg-health-observed' },
  positive: { icon: CheckCircle2, tone: 'text-health-positive', bar: 'bg-health-positive' },
  watch: { icon: AlertTriangle, tone: 'text-health-warning', bar: 'bg-health-warning' },
  neutral: { icon: Circle, tone: 'text-health-ink-muted', bar: 'bg-health-ink-subtle' },
} as const;

export function InsightRow({ insight, compact = false, onAction }: Props) {
  const meta = PRIORITY_META[insight.priority];
  const Icon = meta.icon;

  return (
    <article
      className={cn(
        'group relative flex gap-4 rounded-2xl border border-health-hairline bg-health-surface p-5 transition-shadow hover:shadow-health-soft',
        compact && 'p-4',
      )}
    >
      <div className={cn('mt-0.5 flex-shrink-0', meta.tone)}>
        <Icon className={cn(compact ? 'h-4 w-4' : 'h-5 w-5')} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-health-ink-subtle">
          {insight.eyebrow}
        </div>
        <h4 className={cn('font-health font-semibold text-health-ink', compact ? 'text-sm' : 'text-base leading-snug')}>
          {insight.title}
        </h4>
        <p className={cn('mt-1 text-health-ink-muted', compact ? 'text-xs' : 'text-sm leading-relaxed')}>
          {insight.explanation}
        </p>
        {insight.evidence.length > 0 && (
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {insight.evidence.map((e) => (
              <div key={e.label} className="flex items-baseline gap-1.5">
                <dt className="text-health-ink-subtle">{e.label}</dt>
                <dd className="font-medium tabular-nums text-health-ink">{e.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {insight.actionLabel && onAction && (
          <button
            onClick={() => onAction(insight)}
            className="mt-3 text-xs font-medium text-health-ink underline-offset-4 hover:underline"
          >
            {insight.actionLabel} →
          </button>
        )}
      </div>
    </article>
  );
}
