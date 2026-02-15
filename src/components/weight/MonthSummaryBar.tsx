import { Card, CardContent } from '@/components/ui/card';
import { getMonths, monthSummary } from '@/lib/weight/analytics';
import type { WeightEntry } from '@/lib/weight/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  entries: WeightEntry[];
  selectedMonth: string | null;
  onSelectMonth: (month: string | null) => void;
}

export default function MonthSummaryBar({ entries, selectedMonth, onSelectMonth }: Props) {
  const months = getMonths(entries);
  if (months.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => onSelectMonth(null)}
            className={cn(
              'shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all',
              selectedMonth === null
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            Alle
          </button>
          {months.map(m => {
            const summary = monthSummary(entries, m);
            if (!summary) return null;
            const isActive = selectedMonth === m;
            return (
              <button
                key={m}
                onClick={() => onSelectMonth(isActive ? null : m)}
                className={cn(
                  'shrink-0 px-3 py-2 rounded-lg text-xs transition-all text-left',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="font-semibold block">
                  {format(parseISO(m + '-01'), 'MMM yy', { locale: de })}
                </span>
                <span className="opacity-70">
                  Ø{summary.avg} · {summary.min}–{summary.max}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
