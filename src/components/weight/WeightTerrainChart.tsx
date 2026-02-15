import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, Area, XAxis, YAxis, Tooltip, Line, CartesianGrid,
  ComposedChart, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { movingAverage, linearRegression } from '@/lib/weight/analytics';
import type { WeightEntry } from '@/lib/weight/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

type TrendKey = 'ma7' | 'ma30' | 'regression';

const TREND_CONFIG: Record<TrendKey, { label: string; color: string; dash?: string }> = {
  ma7: { label: 'Ø 7 Tage', color: 'hsl(var(--muted-foreground))', dash: '6 4' },
  ma30: { label: 'Ø 30 Tage', color: 'hsl(220, 70%, 55%)', dash: '8 4' },
  regression: { label: 'Lineare Regression', color: 'hsl(30, 90%, 55%)' },
};

interface Props {
  entries: WeightEntry[];
  selectedMonth: string | null;
}

export default function WeightTerrainChart({ entries, selectedMonth }: Props) {
  const [activeTrends, setActiveTrends] = useState<Set<TrendKey>>(new Set(['ma7']));

  const toggleTrend = (key: TrendKey) => {
    setActiveTrends(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (!selectedMonth) return sorted;
    return sorted.filter(e => e.date.startsWith(selectedMonth));
  }, [entries, selectedMonth]);

  const ma7 = useMemo(() => new Map(movingAverage(entries, 7).map(m => [m.date, m.avg])), [entries]);
  const ma30 = useMemo(() => new Map(movingAverage(entries, 30).map(m => [m.date, m.avg])), [entries]);
  const reg = useMemo(() => new Map(linearRegression(entries).map(m => [m.date, m.value])), [entries]);

  const chartData = useMemo(() => {
    return filtered.map(e => ({
      date: e.date,
      weight: e.weight_kg,
      ma7: ma7.get(e.date) ?? null,
      ma30: ma30.get(e.date) ?? null,
      regression: reg.get(e.date) ?? null,
      label: format(parseISO(e.date), 'dd. MMM', { locale: de }),
    }));
  }, [filtered, ma7, ma30, reg]);

  const xInterval = useMemo(() => {
    const n = chartData.length;
    if (n < 15) return 0;
    if (n < 30) return 2;
    return 4;
  }, [chartData.length]);

  const minW = useMemo(() => Math.min(...filtered.map(e => e.weight_kg)), [filtered]);
  const maxW = useMemo(() => Math.max(...filtered.map(e => e.weight_kg)), [filtered]);
  const domainMin = Math.floor(minW - 1);
  const domainMax = Math.ceil(maxW + 1);

  const gradientId = 'terrainGradient';

  if (chartData.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-rose-400" />
            Gewichtsverlauf
            {selectedMonth && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: de })}
              </span>
            )}
          </CardTitle>
          {/* Toggle chips */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TREND_CONFIG) as TrendKey[]).map(key => {
              const cfg = TREND_CONFIG[key];
              const active = activeTrends.has(key);
              return (
                <button key={key} onClick={() => toggleTrend(key)}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-xs px-2.5 py-1 transition-all"
                    style={{
                      borderColor: active ? cfg.color : 'hsl(var(--border))',
                      backgroundColor: active ? `${cfg.color}15` : 'transparent',
                      color: active ? cfg.color : 'hsl(var(--muted-foreground))',
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: cfg.color, opacity: active ? 1 : 0.3 }}
                    />
                    {cfg.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pr-4 pb-4">
        <ResponsiveContainer width="100%" height={420}>
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
              interval={xInterval}
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
                    {d.ma30 && <p className="text-muted-foreground text-xs">Ø30: {d.ma30} kg</p>}
                    {d.regression && <p className="text-xs" style={{ color: TREND_CONFIG.regression.color }}>Trend: {d.regression} kg</p>}
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
            {activeTrends.has('ma7') && (
              <Line type="monotone" dataKey="ma7" stroke={TREND_CONFIG.ma7.color} strokeWidth={1.5} strokeDasharray={TREND_CONFIG.ma7.dash} dot={false} connectNulls animationDuration={1500} />
            )}
            {activeTrends.has('ma30') && (
              <Line type="monotone" dataKey="ma30" stroke={TREND_CONFIG.ma30.color} strokeWidth={1.5} strokeDasharray={TREND_CONFIG.ma30.dash} dot={false} connectNulls animationDuration={1500} />
            )}
            {activeTrends.has('regression') && (
              <Line type="linear" dataKey="regression" stroke={TREND_CONFIG.regression.color} strokeWidth={1.5} dot={false} connectNulls animationDuration={1500} />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-4 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
            Gewicht
          </span>
          {activeTrends.has('ma7') && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: TREND_CONFIG.ma7.color }} />
              Ø 7 Tage
            </span>
          )}
          {activeTrends.has('ma30') && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: TREND_CONFIG.ma30.color }} />
              Ø 30 Tage
            </span>
          )}
          {activeTrends.has('regression') && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: TREND_CONFIG.regression.color }} />
              Regression
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
