import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useReporting } from '@/contexts/ReportingContext';
import type { PeriodMode, ComparisonMode } from '@/lib/health/periods';
import { formatPeriodLabel } from '@/lib/health/periods';
import { DataFreshness } from './DataFreshness';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: '4w', label: 'Letzte 4 Wochen' },
  { value: '12w', label: 'Letzte 12 Wochen' },
  { value: '6m', label: 'Letzte 6 Monate' },
  { value: 'ytd', label: 'Dieses Jahr' },
  { value: '1y', label: 'Letzte 12 Monate' },
  { value: 'all', label: 'Gesamter Zeitraum' },
];

const COMPARISON_OPTIONS: { value: ComparisonMode; label: string }[] = [
  { value: 'previous', label: 'vs. vorheriger Zeitraum' },
  { value: 'start', label: 'vs. Start' },
  { value: 'none', label: 'kein Vergleich' },
];

interface Props {
  eyebrow?: string;
  title: string;
  context?: string;
  updatedAt?: Date | null;
  sources?: { label: string; count: number }[];
  actions?: React.ReactNode;
  className?: string;
}

export function ReportingHeader({
  eyebrow = 'Performance Intelligence',
  title,
  context,
  updatedAt,
  sources,
  actions,
  className,
}: Props) {
  const { period, comparison, setPeriodMode, setComparison } = useReporting();
  const currentPeriodLabel = PERIOD_OPTIONS.find((o) => o.value === period.mode)?.label ?? 'Zeitraum';
  const currentComparisonLabel = COMPARISON_OPTIONS.find((o) => o.value === comparison)?.label ?? '';

  return (
    <header className={cn('space-y-5', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-health-ink-subtle">
            {eyebrow}
          </div>
          <h1 className="mt-1 font-health text-3xl font-semibold tracking-tight text-health-ink sm:text-4xl">
            {title}
          </h1>
          {context && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-health-ink-muted">{context}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="flex flex-col gap-3 border-t border-health-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-full border-health-hairline bg-health-surface font-medium text-health-ink hover:bg-health-hairline/30"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{currentPeriodLabel}</span>
                <span className="sm:hidden">{period.mode.toUpperCase()}</span>
                <span className="text-health-ink-subtle">·</span>
                <span className="tabular-nums text-health-ink-muted">{formatPeriodLabel(period)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-health-ink-subtle" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriodMode(opt.value)}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                    period.mode === opt.value
                      ? 'bg-health-ink text-health-surface'
                      : 'hover:bg-health-hairline/40 text-health-ink',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 rounded-full text-xs font-medium text-health-ink-muted hover:text-health-ink"
              >
                {currentComparisonLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              {COMPARISON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setComparison(opt.value)}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                    comparison === opt.value
                      ? 'bg-health-ink text-health-surface'
                      : 'hover:bg-health-hairline/40 text-health-ink',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <DataFreshness updatedAt={updatedAt} sources={sources} />
      </div>
    </header>
  );
}
