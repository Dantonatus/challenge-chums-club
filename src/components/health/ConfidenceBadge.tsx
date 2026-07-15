import { cn } from '@/lib/utils';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

interface Props {
  level: ConfidenceLevel;
  sampleSize?: number;
  className?: string;
}

const LABEL: Record<ConfidenceLevel, string> = {
  high: 'Hohe Aussagekraft',
  medium: 'Mittlere Aussagekraft',
  low: 'Geringe Aussagekraft',
};

export function ConfidenceBadge({ level, sampleSize, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        level === 'high' && 'border-health-positive/30 text-health-positive bg-health-positive/5',
        level === 'medium' && 'border-health-warning/30 text-health-warning bg-health-warning/5',
        level === 'low' && 'border-health-hairline text-health-ink-muted',
        className,
      )}
      title={sampleSize !== undefined ? `Basis: ${sampleSize} Messungen` : undefined}
    >
      <span className="flex gap-0.5">
        <span className={cn('h-2 w-0.5 rounded-full', level !== 'low' ? 'bg-current' : 'bg-current/30')} />
        <span className={cn('h-2 w-0.5 rounded-full', level === 'high' ? 'bg-current' : 'bg-current/30')} />
        <span className={cn('h-2 w-0.5 rounded-full', 'bg-current')} />
      </span>
      {LABEL[level]}
    </span>
  );
}

export function inferConfidence(sampleSize: number): ConfidenceLevel {
  if (sampleSize >= 8) return 'high';
  if (sampleSize >= 3) return 'medium';
  return 'low';
}
