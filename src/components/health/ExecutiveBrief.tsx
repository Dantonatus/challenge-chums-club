import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { InsightRow } from './InsightRow';
import { EmptyInsightState } from './EmptyInsightState';
import type { Insight } from '@/lib/health/executiveInsights';
import { cn } from '@/lib/utils';

interface Props {
  insights: Insight[];
  className?: string;
}

export function ExecutiveBrief({ insights, className }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const primary = insights.find((i) => i.priority === 'primary') ?? insights[0];
  const secondary = useMemo(() => insights.filter((i) => i.id !== primary?.id).slice(0, 2), [insights, primary]);
  const rest = insights.filter((i) => i.id !== primary?.id && !secondary.includes(i));

  if (!primary) {
    return (
      <div className={className}>
        <EmptyInsightState />
      </div>
    );
  }

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-health-ink-subtle">
            Executive Brief
          </div>
          <h2 className="mt-1 font-health text-lg font-semibold text-health-ink">Das Wichtigste zuerst</h2>
        </div>
        {insights.length > 3 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="text-xs font-medium text-health-ink-muted underline-offset-4 hover:text-health-ink hover:underline">
              Alle {insights.length} Erkenntnisse
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Alle Erkenntnisse</SheetTitle>
                <SheetDescription>Vollständige Liste deterministisch berechneter Insights im gewählten Zeitraum.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                {insights.map((i) => (
                  <InsightRow key={i.id} insight={i} compact />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <InsightRow insight={primary} />
      {secondary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {secondary.map((i) => (
            <InsightRow key={i.id} insight={i} compact />
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <button
          onClick={() => setSheetOpen(true)}
          className="text-xs text-health-ink-muted underline-offset-4 hover:text-health-ink hover:underline"
        >
          + {rest.length} weitere Erkenntnisse
        </button>
      )}
    </section>
  );
}
