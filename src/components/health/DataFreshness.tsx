import { cn } from '@/lib/utils';

interface Props {
  updatedAt?: Date | null;
  sources?: { label: string; count: number }[];
  className?: string;
}

export function DataFreshness({ updatedAt, sources, className }: Props) {
  const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-health-ink-muted', className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-health-positive/40 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-health-positive" />
        </span>
        {updatedAt ? `Aktualisiert ${fmt.format(updatedAt)}` : 'Noch keine Daten'}
      </span>
      {sources?.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-health-hairline" />
          <span className="tabular-nums">{s.count}</span> {s.label}
        </span>
      ))}
    </div>
  );
}
