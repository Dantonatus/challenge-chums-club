import * as React from 'react';
import { cn } from '@/lib/utils';

export type ComparisonTone = 'positive' | 'watch' | 'neutral' | 'muted';

interface Props {
  value: number;
  suffix?: string;
  digits?: number;
  positiveWhen?: 'up' | 'down' | 'either';
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function ComparisonPill({
  value,
  suffix = '',
  digits = 1,
  positiveWhen = 'up',
  label,
  className,
  size = 'sm',
}: Props) {
  const tone: ComparisonTone =
    Math.abs(value) < 0.05
      ? 'neutral'
      : positiveWhen === 'either'
        ? 'positive'
        : (positiveWhen === 'up' && value > 0) || (positiveWhen === 'down' && value < 0)
          ? 'positive'
          : 'watch';

  const sign = value > 0 ? '+' : '';
  const formatted = value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium tabular-nums',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        tone === 'positive' && 'bg-health-positive/10 text-health-positive',
        tone === 'watch' && 'bg-health-warning/10 text-health-warning',
        tone === 'neutral' && 'bg-health-ink-muted/10 text-health-ink-muted',
        tone === 'muted' && 'text-health-ink-subtle',
        className,
      )}
      aria-label={label}
    >
      <Arrow tone={tone} value={value} />
      {sign}
      {formatted}
      {suffix}
    </span>
  );
}

function Arrow({ tone, value }: { tone: ComparisonTone; value: number }) {
  if (Math.abs(value) < 0.05) {
    return (
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
        <path d="M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
      <path
        d={value > 0 ? 'M2 7l3-4 3 4' : 'M2 3l3 4 3-4'}
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
