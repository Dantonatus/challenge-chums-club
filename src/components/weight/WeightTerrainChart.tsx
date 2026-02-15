import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Line, CartesianGrid,
  ComposedChart, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { movingAverage } from '@/lib/weight/analytics';
import type { WeightEntry } from '@/lib/weight/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  entries: WeightEntry[];
  selectedMonth: string | null;
}

export default function WeightTerrainChart({ entries, selectedMonth }: Props) {
  const filtered = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (!selectedMonth) return sorted;
    return sorted.filter(e => e.date.startsWith(selectedMonth));
  }, [entries, selectedMonth]);

  const ma = useMemo(() => movingAverage(entries, 7), [entries]);
  const maMap = useMemo(() => new Map(ma.map(m => [m.date, m.avg])), [ma]);

  const chartData = useMemo(() => {
    return filtered.map(e => ({
      date: e.date,
      weight: e.weight_kg,
      ma7: maMap.get(e.date) ?? null,
      label: format(parseISO(e.date), 'dd. MMM', { locale: de }),
    }));
  }, [filtered, maMap]);

  const minW = useMemo(() => Math.min(...filtered.map(e => e.weight_kg)), [filtered]);
  const maxW = useMemo(() => Math.max(...filtered.map(e => e.weight_kg)), [filtered]);
  const domainMin = Math.floor(minW - 1);
  const domainMax = Math.ceil(maxW + 1);

  // Dynamic gradient stops based on weight range
  const gradientId = 'terrainGradient';

  if (chartData.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-rose-400" />
          Gewichtsverlauf
          {selectedMonth && (
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: de })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pr-4 pb-4">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 80%, 60%)" stopOpacity={0.8} />
                <stop offset="40%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={40}
              unit=" kg"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
                    <p className="font-medium text-foreground">{d.weight} kg</p>
                    {d.ma7 && <p className="text-muted-foreground text-xs">Ø7: {d.ma7} kg</p>}
                    <p className="text-muted-foreground text-xs">{d.label}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              animationDuration={1200}
              dot={false}
              activeDot={{
                r: 6,
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 3,
              }}
            />
            <Line
              type="monotone"
              dataKey="ma7"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
              animationDuration={1500}
            />
            {/* Pulsing current dot */}
            {chartData.length > 0 && (
              <ReferenceLine
                x={chartData[chartData.length - 1].label}
                stroke="transparent"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
