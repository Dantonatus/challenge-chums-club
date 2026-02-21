import { useState, useEffect, useCallback } from 'react';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  addWeeks, addMonths, addQuarters, format, getWeek,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type PeriodMode = 'week' | 'month' | 'quarter';

interface Props {
  onChange: (start: Date, end: Date) => void;
}

function computeRange(mode: PeriodMode, offset: number) {
  const today = new Date();
  const opts = { weekStartsOn: 1 as const };

  if (mode === 'week') {
    const base = addWeeks(today, offset);
    return { start: startOfWeek(base, opts), end: endOfWeek(base, opts) };
  }
  if (mode === 'month') {
    const base = addMonths(today, offset);
    return { start: startOfMonth(base), end: endOfMonth(base) };
  }
  const base = addQuarters(today, offset);
  return { start: startOfQuarter(base), end: endOfQuarter(base) };
}

function buildLabel(mode: PeriodMode, start: Date, end: Date) {
  if (mode === 'week') {
    const w = getWeek(start, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    return `KW ${w} · ${format(start, 'dd.', { locale: de })}–${format(end, 'dd. MMM yyyy', { locale: de })}`;
  }
  if (mode === 'month') {
    return format(start, 'MMMM yyyy', { locale: de });
  }
  const q = Math.ceil((start.getMonth() + 1) / 3);
  return `Q${q} ${start.getFullYear()} (${format(start, 'MMM', { locale: de })}–${format(end, 'MMM', { locale: de })})`;
}

export default function PeriodNavigator({ onChange }: Props) {
  const [mode, setMode] = useState<PeriodMode>('week');
  const [offset, setOffset] = useState(0);

  const { start, end } = computeRange(mode, offset);

  const fireChange = useCallback(() => {
    const { start: s, end: e } = computeRange(mode, offset);
    onChange(s, e);
  }, [mode, offset, onChange]);

  useEffect(() => { fireChange(); }, [fireChange]);

  const handleModeChange = (v: string) => {
    if (!v) return;
    setMode(v as PeriodMode);
    setOffset(0);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffset(o => o - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          {buildLabel(mode, start, end)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={offset >= 0}
          onClick={() => setOffset(o => o + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={handleModeChange}
        size="sm"
        className="bg-muted rounded-lg p-0.5"
      >
        <ToggleGroupItem value="week" className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
          Woche
        </ToggleGroupItem>
        <ToggleGroupItem value="month" className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
          Monat
        </ToggleGroupItem>
        <ToggleGroupItem value="quarter" className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
          Quartal
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
