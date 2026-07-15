import * as React from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';

interface Props {
  title: string;
  eyebrow?: string;
  caption?: string;
  methodology?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function ChartFrame({ title, eyebrow, caption, methodology, action, className, children }: Props) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-health-hairline bg-health-surface shadow-health-soft',
        'p-5 sm:p-6',
        className,
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-health-ink-subtle">
              {eyebrow}
            </div>
          )}
          <h3 className="font-health text-base font-semibold leading-tight text-health-ink">{title}</h3>
          {caption && <p className="mt-1 text-sm text-health-ink-muted">{caption}</p>}
        </div>
        <div className="flex items-center gap-1">
          {action}
          {methodology && (
            <Sheet>
              <SheetTrigger
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-health-ink-subtle transition-colors hover:bg-health-hairline/40 hover:text-health-ink"
                aria-label="Methodik anzeigen"
              >
                <Info className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>{title}</SheetTitle>
                  <SheetDescription>Methodik & Berechnung</SheetDescription>
                </SheetHeader>
                <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-health-ink-muted">
                  {methodology}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}
