import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, Area, XAxis, YAxis, Tooltip, Line, CartesianGrid,
  ComposedChart, ReferenceLine, ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { movingAverage, linearRegression, forecast } from '@/lib/weight/analytics';
import type { WeightEntry } from '@/lib/weight/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

type TrendKey = 'ma7' | 'ma30' | 'regression' | 'forecast';

const FORECAST_COLOR = 'hsl(270, 70%, 55%)';

const TREND_CONFIG: Record<TrendKey, { label: string; color: string; dash?: string }> = {
  ma7: { label: 'Ø 7 Tage', color: 'hsl(var(--muted-foreground))', dash: '6 4' },
  ma30: { label: 'Ø 30 Tage', color: 'hsl(220, 70%, 55%)', dash: '8 4' },
  regression: { label: 'Lineare Regression', color: 'hsl(30, 90%, 55%)' },
  forecast: { label: 'Prognose 30d', color: FORECAST_COLOR, dash: '6 3' },
};

interface Props {
  entries: WeightEntry[];
  selectedMonth: string | null;
}

export default function WeightTerrainChart({ entries, selectedMonth }: Props) {
  const [activeTrends, setActiveTrends] = useState<Set<TrendKey>>(new Set(['ma7', 'forecast']));

  const toggleTrend = (key: TrendKey) => {
    setActiveTrends(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sorted = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);

  const filtered = useMemo(() => {
    if (!selectedMonth) return sorted;
    return sorted.filter(e => e.date.startsWith(selectedMonth));
  }, [sorted, selectedMonth]);

  const ma7 = useMemo(() => new Map(movingAverage(entries, 7).map(m => [m.date, m.avg])), [entries]);
  const ma30 = useMemo(() => new Map(movingAverage(entries, 30).map(m => [m.date, m.avg])), [entries]);
  const reg = useMemo(() => new Map(linearRegression(entries).map(m => [m.date, m.value])), [entries]);
  const forecastData = useMemo(() => forecast(entries), [entries]);

  // Build chart data: real points + forecast points
  const { chartData, lastRealLabel, forecastStartLabel } = useMemo(() => {
    const showForecast = activeTrends.has('forecast') && !selectedMonth && forecastData.length > 0;

    const realPoints = filtered.map(e => ({
      date: e.date,
      weight: e.weight_kg,
      ma7: ma7.get(e.date) ?? null,
      ma30: ma30.get(e.date) ?? null,
      regression: reg.get(e.date) ?? null,
      forecast: null as number | null,
      forecastLower: null as number | null,
      forecastUpper: null as number | null,
      label: format(parseISO(e.date), 'dd. MMM', { locale: de }),
      isForecast: false,
    }));

    // Bridge: last real point also gets forecast value for seamless connection
    if (showForecast && realPoints.length > 0) {
      const last = realPoints[realPoints.length - 1];
      last.forecast = last.weight;
      last.forecastLower = last.weight;
      last.forecastUpper = last.weight;
    }

    const lastLabel = realPoints.length > 0 ? realPoints[realPoints.length - 1].label : null;

    const forecastPoints = showForecast
      ? forecastData.map(f => ({
          date: f.date,
          weight: null as number | null,
          ma7: null as number | null,
          ma30: null as number | null,
          regression: null as number | null,
          forecast: f.value,
          forecastLower: f.lower,
          forecastUpper: f.upper,
          label: format(parseISO(f.date), 'dd. MMM', { locale: de }),
          isForecast: true,
        }))
      : [];

    const firstForecastLabel = forecastPoints.length > 0 ? forecastPoints[0].label : null;

    return {
      chartData: [...realPoints, ...forecastPoints],
      lastRealLabel: lastLabel,
      forecastStartLabel: firstForecastLabel,
    };
  }, [filtered, ma7, ma30, reg, forecastData, activeTrends, selectedMonth]);

  const xInterval = useMemo(() => {
    const n = chartData.length;
    if (n < 15) return 0;
    if (n < 30) return 2;
    if (n < 60) return 4;
    return 6;
  }, [chartData.length]);

  // Y domain extends to include confidence bands
  const { domainMin, domainMax } = useMemo(() => {
    const allValues: number[] = [];
    for (const d of chartData) {
      if (d.weight != null) allValues.push(d.weight);
      if (d.forecastUpper != null) allValues.push(d.forecastUpper);
      if (d.forecastLower != null) allValues.push(d.forecastLower);
    }
    if (allValues.length === 0) return { domainMin: 60, domainMax: 100 };
    return {
      domainMin: Math.floor(Math.min(...allValues) - 1),
      domainMax: Math.ceil(Math.max(...allValues) + 1),
    };
  }, [chartData]);

  const showForecastVisuals = activeTrends.has('forecast') && !selectedMonth && forecastData.length > 0;

  if (chartData.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; r: 6; }
          50% { opacity: 0.5; r: 10; }
        }
        .forecast-pulse { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>
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
              {/* Terrain gradient for real data */}
              <linearGradient id="terrainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 80%, 60%)" stopOpacity={0.8} />
                <stop offset="40%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0.15} />
              </linearGradient>
              {/* Forecast confidence band gradient */}
              <linearGradient id="forecastBandGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={FORECAST_COLOR} stopOpacity={0.2} />
                <stop offset="100%" stopColor={FORECAST_COLOR} stopOpacity={0.06} />
              </linearGradient>
              {/* Forecast zone background */}
              <linearGradient id="forecastZoneGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={FORECAST_COLOR} stopOpacity={0.06} />
                <stop offset="100%" stopColor={FORECAST_COLOR} stopOpacity={0.02} />
              </linearGradient>
              {/* Glow filter for forecast line */}
              <filter id="forecastGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />

            {/* Forecast zone background */}
            {showForecastVisuals && lastRealLabel && forecastStartLabel && (
              <ReferenceArea
                x1={lastRealLabel}
                x2={chartData[chartData.length - 1].label}
                fill="url(#forecastZoneGradient)"
                fillOpacity={1}
                strokeOpacity={0}
              />
            )}

            {/* "Heute" vertical divider line */}
            {showForecastVisuals && lastRealLabel && (
              <ReferenceLine
                x={lastRealLabel}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: 'HEUTE',
                  position: 'top',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

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
                const isFc = d.isForecast;
                return (
                  <div className={`rounded-lg border px-3 py-2 text-sm shadow-md ${
                    isFc
                      ? 'border-purple-500/30 bg-purple-950/90 text-purple-100'
                      : 'border-border bg-popover text-foreground'
                  }`}>
                    {isFc ? (
                      <>
                        <p className="font-medium" style={{ color: FORECAST_COLOR }}>
                          Prognose: {d.forecast} kg
                        </p>
                        <p className="text-xs opacity-80">
                          Bereich: {d.forecastLower} – {d.forecastUpper} kg
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{d.weight} kg</p>
                        {d.ma7 && <p className="text-muted-foreground text-xs">Ø7: {d.ma7} kg</p>}
                        {d.ma30 && <p className="text-muted-foreground text-xs">Ø30: {d.ma30} kg</p>}
                        {d.regression && (
                          <p className="text-xs" style={{ color: TREND_CONFIG.regression.color }}>
                            Trend: {d.regression} kg
                          </p>
                        )}
                      </>
                    )}
                    <p className={`text-xs ${isFc ? 'opacity-60' : 'text-muted-foreground'}`}>{d.label}</p>
                  </div>
                );
              }}
            />

            {/* Confidence band */}
            {showForecastVisuals && (
              <Area
                type="monotone"
                dataKey="forecastUpper"
                stroke="none"
                fill="url(#forecastBandGradient)"
                fillOpacity={1}
                animationDuration={1500}
                dot={false}
                activeDot={false}
                connectNulls={false}
              />
            )}
            {showForecastVisuals && (
              <Area
                type="monotone"
                dataKey="forecastLower"
                stroke="none"
                fill="hsl(var(--card))"
                fillOpacity={1}
                animationDuration={1500}
                dot={false}
                activeDot={false}
                connectNulls={false}
              />
            )}

            {/* Real weight area */}
            <Area
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#terrainGradient)"
              animationDuration={1200}
              dot={false}
              activeDot={{
                r: 6,
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 3,
              }}
              connectNulls={false}
            />

            {/* MA7 */}
            {activeTrends.has('ma7') && (
              <Line type="monotone" dataKey="ma7" stroke={TREND_CONFIG.ma7.color} strokeWidth={1.5} strokeDasharray={TREND_CONFIG.ma7.dash} dot={false} connectNulls animationDuration={1500} />
            )}
            {/* MA30 */}
            {activeTrends.has('ma30') && (
              <Line type="monotone" dataKey="ma30" stroke={TREND_CONFIG.ma30.color} strokeWidth={1.5} strokeDasharray={TREND_CONFIG.ma30.dash} dot={false} connectNulls animationDuration={1500} />
            )}
            {/* Regression */}
            {activeTrends.has('regression') && (
              <Line type="linear" dataKey="regression" stroke={TREND_CONFIG.regression.color} strokeWidth={1.5} dot={false} connectNulls animationDuration={1500} />
            )}

            {/* Forecast glow line (broad, blurred) */}
            {showForecastVisuals && (
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={FORECAST_COLOR}
                strokeWidth={6}
                strokeOpacity={0.25}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
                animationDuration={1800}
                filter="url(#forecastGlow)"
              />
            )}
            {/* Forecast sharp line */}
            {showForecastVisuals && (
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={FORECAST_COLOR}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
                animationDuration={1800}
                activeDot={{
                  r: 5,
                  fill: FORECAST_COLOR,
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
              />
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
          {showForecastVisuals && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: FORECAST_COLOR }} />
              <span style={{ color: FORECAST_COLOR }}>Prognose</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
