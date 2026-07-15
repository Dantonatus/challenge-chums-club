import * as React from 'react';
import { cn } from '@/lib/utils';
import { ComparisonPill } from './ComparisonPill';

interface Props {
  label: string;
  value: string;
  unit?: string;
  delta?: {
    value: number;
    suffix?: string;
    digits?: number;
    positiveWhen?: 'up' | 'down' | 'either';
    caption?: string;
  };
  sparkline?: React.ReactNode;
  tone?: 'default' | 'observed' | 'muscle' | 'fat';
  className?: string;
}

const TONE_CLASS: Record<Required<Props>['tone'], string> = {
  default: 'text-health-ink',
  observed: 'text-health-observed',
  muscle: 'text-health-muscle',
  fat: 'text-health-fat',
};

export function MetricHero({ label, value, unit, delta, sparkline, tone = 'default', className }: Props) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="text-xs font-medium uppercase tracking-wider text-health-ink-subtle">{label}</div>
      <div className="flex items-end gap-3">
        <span className={cn('font-health text-[44px] leading-none font-semibold tabular-nums tracking-tight', TONE_CLASS[tone])}>
          {value}
        </span>
        {unit && <span className="mb-1 text-sm text-health-ink-muted">{unit}</span>}
      </div>
      {(delta || sparkline) && (
        <div className="flex flex-wrap items-center gap-3">
          {delta && (
            <ComparisonPill
              value={delta.value}
              suffix={delta.suffix}
              digits={delta.digits}
              positiveWhen={delta.positiveWhen}
            />
          )}
          {delta?.caption && <span className="text-xs text-health-ink-muted">{delta.caption}</span>}
          {sparkline}
        </div>
      )}
    </div>
  );
}
