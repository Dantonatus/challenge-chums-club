import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyInsightState({
  title = 'Noch zu wenig Daten',
  description = 'Für eine belastbare Analyse fehlen im gewählten Zeitraum ausreichend Messungen. Wähle einen längeren Zeitraum oder ergänze Daten.',
  icon,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-health-hairline bg-health-surface/60 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-health-hairline/40 text-health-ink-muted">
        {icon ?? <Compass className="h-5 w-5" />}
      </div>
      <div>
        <h4 className="font-health text-sm font-semibold text-health-ink">{title}</h4>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-health-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
