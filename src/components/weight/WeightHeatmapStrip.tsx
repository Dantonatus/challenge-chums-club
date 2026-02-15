import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { WeightEntry } from '@/lib/weight/types';
import { format, parseISO, eachDayOfInterval, subDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  entries: WeightEntry[];
}

export default function WeightHeatmapStrip({ entries }: Props) {
  const { days, mean } = useMemo(() => {
    if (entries.length === 0) return { days: [], mean: 0 };
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const m = sorted.reduce((s, e) => s + e.weight_kg, 0) / sorted.length;
    const entryMap = new Map(sorted.map(e => [e.date, e.weight_kg]));

    const end = new Date();
    const start = subDays(end, 89); // ~3 months
    const allDays = eachDayOfInterval({ start, end });

    return {
      days: allDays.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const weight = entryMap.get(dateStr) ?? null;
        return { date: dateStr, weight, day: d };
      }),
      mean: m,
    };
  }, [entries]);

  if (entries.length === 0) return null;

  const maxDev = Math.max(
    ...entries.map(e => Math.abs(e.weight_kg - mean)),
    1
  );

  function getColor(weight: number | null): string {
    if (weight === null) return 'bg-muted/30';
    const dev = weight - mean;
    const intensity = Math.min(Math.abs(dev) / maxDev, 1);
    if (dev > 0) {
      // Above average: warm colors
      const alpha = 0.2 + intensity * 0.6;
      return `bg-rose-500/${Math.round(alpha * 100)}`;
    } else {
      // Below average: cool colors
      const alpha = 0.2 + intensity * 0.6;
      return `bg-emerald-500/${Math.round(alpha * 100)}`;
    }
  }

  // Use inline style for opacity instead of dynamic Tailwind classes
  function getStyle(weight: number | null): React.CSSProperties {
    if (weight === null) return { backgroundColor: 'hsl(var(--muted) / 0.3)' };
    const dev = weight - mean;
    const intensity = Math.min(Math.abs(dev) / maxDev, 1);
    const alpha = 0.2 + intensity * 0.6;
    if (dev > 0) {
      return { backgroundColor: `hsl(0, 80%, 60%, ${alpha})` };
    } else {
      return { backgroundColor: `hsl(145, 70%, 45%, ${alpha})` };
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Tägliche Abweichung (90 Tage)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Durchschnitt: {Math.round(mean * 10) / 10} kg · Grün = unter Ø · Rot = über Ø
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-[3px]">
          {days.map(d => (
            <Tooltip key={d.date}>
              <TooltipTrigger asChild>
                <div
                  className="w-3 h-3 rounded-[2px] cursor-pointer transition-transform hover:scale-150"
                  style={getStyle(d.weight)}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">
                  {format(d.day, 'dd. MMM', { locale: de })}
                </p>
                {d.weight !== null ? (
                  <p>{d.weight} kg ({d.weight > mean ? '+' : ''}{Math.round((d.weight - mean) * 10) / 10})</p>
                ) : (
                  <p className="text-muted-foreground">Keine Messung</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
