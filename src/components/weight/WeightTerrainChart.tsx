import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, Area, XAxis, YAxis, Tooltip, Line, CartesianGrid,
  ComposedChart, ReferenceLine, ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, History } from 'lucide-react';
import { movingAverage, linearRegression, forecast } from '@/lib/weight/analytics';
import type { WeightEntry, ForecastSnapshot } from '@/lib/weight/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

type TrendKey = 'ma7' | 'ma30' | 'regression' | 'forecast14' | 'forecast30' | 'forecast60';

const FORECAST_COLOR = 'hsl(270, 70%, 55%)';

type TrendDescription = {
  title: string;
  text: string;
  calc?: string;
  elements?: { name: string; formula: string }[];
};

const FORECAST_ELEMENTS: { name: string; formula: string }[] = [
  {
    name: 'Gestrichelte Linie (Trend)',
    formula: 'Damped Holt-Winters: L = α·y + (1-α)·(L + φ·T), T = β·(L - L_prev) + (1-β)·φ·T. Vorhersage: P(k) = L + Σ(φ^1..k)·T. Parameter: α=0.4, β=0.2, φ=0.95.',
  },
  {
    name: 'Dünne kurvige Linie (Simulation)',
    formula: 'Sim(k) = P(k) + dailySwing · sin(1.3k + cos(0.7k)). dailySwing = RMS der täglichen Differenzen = √(Σ(yₜ - yₜ₋₁)² / n).',
  },
  {
    name: 'Konfidenzband (Schattierung)',
    formula: 'Band = P(k) ± min(1.96 · dailySwing · √k, 2.0 kg). Wächst mit √k, gedeckelt bei ±2.0 kg.',
  },
];

const TREND_CONFIG: Record<TrendKey, { label: string; color: string; dash?: string; description?: TrendDescription }> = {
  ma7: { label: 'Ø 7 Tage', color: 'hsl(var(--muted-foreground))', dash: '6 4', description: { title: 'Gleitender Durchschnitt (7 Tage)', text: 'Glättet Tagesschwankungen und zeigt den kurzfristigen Trend. Ideal um zu sehen ob sich in der aktuellen Woche etwas bewegt.', calc: 'Für jeden Tag wird der Durchschnitt der letzten 7 Einträge berechnet: Summe(Gewicht[i-6..i]) / Anzahl. Gerundet auf 1 Dezimalstelle.' } },
  ma30: { label: 'Ø 30 Tage', color: 'hsl(220, 70%, 55%)', dash: '8 4', description: { title: 'Gleitender Durchschnitt (30 Tage)', text: 'Filtert Wasser- und Verdauungsschwankungen fast komplett raus. Zeigt den echten mittelfristigen Trend.', calc: 'Gleiche Methode wie Ø 7, aber mit einem Fenster von 30 Einträgen. Braucht entsprechend mehr Daten um aussagekräftig zu sein.' } },
  regression: { label: 'Lineare Regression', color: 'hsl(30, 90%, 55%)', description: { title: 'Lineare Regression', text: 'Berechnet eine gerade „Best-Fit"-Linie durch alle Datenpunkte. Zeigt die durchschnittliche Richtung über den gesamten Zeitraum – steigt die Linie, nimmst du insgesamt zu, fällt sie, nimmst du ab.', calc: 'Least-Squares-Fit: Berechnet Steigung m = (n·ΣxY - Σx·Σy) / (n·Σx² - (Σx)²) und Achsenabschnitt b = (Σy - m·Σx) / n. Jeder Punkt liegt auf y = m·x + b.' } },
  forecast14: { label: 'Prognose 14d', color: FORECAST_COLOR, dash: '6 3', description: { title: 'Holt-Winters Exponential Smoothing (14 Tage)', text: 'Gewichtet die letzten 30 Tage besonders stark. Der Trend wird leicht gedämpft, um zu zeigen wohin es geht wenn du so weitermachst.', elements: FORECAST_ELEMENTS } },
  forecast30: { label: 'Prognose 30d', color: FORECAST_COLOR, dash: '6 3', description: { title: 'Holt-Winters Exponential Smoothing (30 Tage)', text: 'Gleiche Methode wie die 14-Tage-Prognose, aber auf 30 Tage in die Zukunft. Die Unsicherheit wächst mit der Zeit.', elements: FORECAST_ELEMENTS } },
  forecast60: { label: 'Prognose 60d', color: FORECAST_COLOR, dash: '6 3', description: { title: 'Holt-Winters Exponential Smoothing (60 Tage)', text: 'Langfristprognose über 2 Monate. Ideal um zu sehen wohin der aktuelle Trend langfristig führt.', elements: FORECAST_ELEMENTS } },
};

interface Props {
  entries: WeightEntry[];
  selectedMonth: string | null;
  snapshots?: ForecastSnapshot[];
}

export default function WeightTerrainChart({ entries, selectedMonth, snapshots = [] }: Props) {
  const [activeTrends, setActiveTrends] = useState<Set<TrendKey>>(new Set(['ma7', 'forecast14']));
  const [showHistory, setShowHistory] = useState(false);

  const toggleTrend = (key: TrendKey) => {
    setActiveTrends(prev => {
      const next = new Set(prev);
      const forecastKeys: TrendKey[] = ['forecast14', 'forecast30', 'forecast60'];
      if (forecastKeys.includes(key)) {
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
          for (const fk of forecastKeys) {
            if (fk !== key) next.delete(fk);
          }
        }
      } else {
        next.has(key) ? next.delete(key) : next.add(key);
      }
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
  const forecast14Data = useMemo(() => forecast(entries, 14), [entries]);
  const forecast30Data = useMemo(() => forecast(entries, 30), [entries]);
  const forecast60Data = useMemo(() => forecast(entries, 60), [entries]);

  const activeForecastKey = activeTrends.has('forecast14') ? 'forecast14' : activeTrends.has('forecast30') ? 'forecast30' : activeTrends.has('forecast60') ? 'forecast60' : null;
  const activeForecast = activeForecastKey === 'forecast14' ? forecast14Data : activeForecastKey === 'forecast30' ? forecast30Data : activeForecastKey === 'forecast60' ? forecast60Data : null;
  const forecastPoints = activeForecast?.points ?? [];
  const dailySwing = activeForecast?.dailySwing ?? forecast14Data.dailySwing;

  // Filter snapshots by active forecast days
  const activeForecastDays = activeForecastKey === 'forecast14' ? 14 : activeForecastKey === 'forecast30' ? 30 : activeForecastKey === 'forecast60' ? 60 : null;
  const filteredSnapshots = useMemo(() => {
    if (!showHistory || !activeForecastDays) return [];
    return snapshots
      .filter(s => s.forecast_days === activeForecastDays)
      .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))
      .slice(0, 10);
  }, [snapshots, showHistory, activeForecastDays]);

  // Build chart data: real points + forecast points
  const { chartData, lastRealLabel, forecastStartLabel } = useMemo(() => {
    const showForecast = activeForecastKey !== null && !selectedMonth && forecastPoints.length > 0;

    const realPoints = filtered.map(e => {
      const point: Record<string, any> = {
        date: e.date,
        ts: parseISO(e.date).getTime(),
        weight: e.weight_kg,
        ma7: ma7.get(e.date) ?? null,
        ma30: ma30.get(e.date) ?? null,
        regression: reg.get(e.date) ?? null,
        forecast: null,
        forecastSimulated: null,
        forecastLower: null,
        forecastUpper: null,
        label: format(parseISO(e.date), 'dd. MMM', { locale: de }),
        isForecast: false,
      };
      // Add snapshot values for dates that fall in historical forecast ranges
      filteredSnapshots.forEach((snap, idx) => {
        const pts = snap.points_json;
        const match = pts.find(p => p.date === e.date);
        if (match) {
          point[`history_${idx}`] = match.value;
        }
      });
      return point;
    });

    // Bridge: last real point also gets forecast value for seamless connection
    if (showForecast && realPoints.length > 0) {
      const last = realPoints[realPoints.length - 1];
      last.forecast = last.weight;
      last.forecastSimulated = last.weight;
      last.forecastLower = last.weight;
      last.forecastUpper = last.weight;
    }

    const lastTs = realPoints.length > 0 ? realPoints[realPoints.length - 1].ts : null;

    const fcPoints = showForecast
      ? forecastPoints.map(f => {
           const point: Record<string, any> = {
             date: f.date,
             ts: parseISO(f.date).getTime(),
             weight: null,
             ma7: null,
             ma30: null,
             regression: null,
             forecast: f.value,
             forecastSimulated: f.simulated,
             forecastLower: f.lower,
             forecastUpper: f.upper,
             label: format(parseISO(f.date), 'dd. MMM', { locale: de }),
             isForecast: true,
           };
          filteredSnapshots.forEach((snap, idx) => {
            const pts = snap.points_json;
            const match = pts.find(p => p.date === f.date);
            if (match) {
              point[`history_${idx}`] = match.value;
            }
          });
          return point;
        })
      : [];

    const firstForecastLabel = fcPoints.length > 0 ? fcPoints[0].label : null;

    return {
      chartData: [...realPoints, ...fcPoints],
      lastRealLabel: lastLabel,
      forecastStartLabel: firstForecastLabel,
    };
  }, [filtered, ma7, ma30, reg, forecastPoints, activeForecastKey, selectedMonth, filteredSnapshots]);

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
      // Include history values
      filteredSnapshots.forEach((_, idx) => {
        const v = d[`history_${idx}`];
        if (v != null) allValues.push(v);
      });
    }
    if (allValues.length === 0) return { domainMin: 60, domainMax: 100 };
    return {
      domainMin: Math.floor(Math.min(...allValues) - 1),
      domainMax: Math.ceil(Math.max(...allValues) + 1),
    };
  }, [chartData, filteredSnapshots]);

  const showForecastVisuals = activeForecastKey !== null && !selectedMonth && forecastPoints.length > 0;

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
              <span key={key} className="inline-flex items-center">
                  <button onClick={() => toggleTrend(key)}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer text-xs px-2.5 py-1 transition-all inline-flex items-center gap-1"
                      style={{
                        borderColor: active ? cfg.color : 'hsl(var(--border))',
                        backgroundColor: active ? `${cfg.color}15` : 'transparent',
                        color: active ? cfg.color : 'hsl(var(--muted-foreground))',
                        opacity: active ? 1 : 0.6,
                      }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: cfg.color, opacity: active ? 1 : 0.3 }}
                      />
                      {cfg.label}
                      {cfg.description && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <span
                              role="button"
                              className="inline-flex items-center ml-0.5 hover:opacity-100 opacity-60 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info size={11} />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 text-sm space-y-2" side="bottom" align="end">
                            <p className="font-semibold">{cfg.description.title}</p>
                            <p className="text-muted-foreground text-xs">
                              {cfg.description.text}
                            </p>
                            {cfg.description.calc && (
                              <p className="text-muted-foreground text-xs font-mono bg-muted/50 rounded p-1.5">
                                {cfg.description.calc}
                              </p>
                            )}
                            {cfg.description.elements && (
                              <div className="space-y-1.5">
                                {cfg.description.elements.map((el) => (
                                  <div key={el.name}>
                                    <p className="text-xs font-semibold">{el.name}</p>
                                    <p className="text-muted-foreground text-[10px] font-mono bg-muted/50 rounded p-1.5 leading-relaxed">
                                      {el.formula}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      )}
                    </Badge>
                  </button>
                </span>
              );
            })}
            {/* History toggle */}
            <span className="inline-flex items-center">
              <button onClick={() => setShowHistory(prev => !prev)}>
                <Badge
                  variant="outline"
                  className="cursor-pointer text-xs px-2.5 py-1 transition-all inline-flex items-center gap-1"
                  style={{
                    borderColor: showHistory ? FORECAST_COLOR : 'hsl(var(--border))',
                    backgroundColor: showHistory ? `${FORECAST_COLOR}15` : 'transparent',
                    color: showHistory ? FORECAST_COLOR : 'hsl(var(--muted-foreground))',
                    opacity: showHistory ? 1 : 0.6,
                  }}
                >
                  <History size={12} />
                  Alte Prognosen
                  <Popover>
                    <PopoverTrigger asChild>
                      <span
                        role="button"
                        className="inline-flex items-center ml-0.5 hover:opacity-100 opacity-60 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info size={11} />
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-sm space-y-2" side="bottom" align="end">
                      <p className="font-semibold">Alte Prognosen</p>
                      <p className="text-muted-foreground text-xs">
                        Zeigt frühere gespeicherte Prognosen als Overlay-Linien. So kannst du vergleichen wie genau deine Vorhersagen waren vs. was tatsächlich passiert ist.
                      </p>
                      <p className="text-muted-foreground text-xs font-mono bg-muted/50 rounded p-1.5">
                        Snapshots werden bei jedem neuen Eintrag gespeichert (Datum, Prognosepunkte, dailySwing, forecast_days). Die letzten 10 passenden Snapshots werden als Overlay-Linien gerendert.
                      </p>
                    </PopoverContent>
                  </Popover>
                </Badge>
              </button>
            </span>
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
                // Collect history values
                const historyEntries: { snapDate: string; value: number }[] = [];
                filteredSnapshots.forEach((snap, idx) => {
                  const v = d[`history_${idx}`];
                  if (v != null) {
                    historyEntries.push({ snapDate: snap.snapshot_date, value: v });
                  }
                });
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
                    {historyEntries.map((h, i) => (
                      <p key={i} className="text-xs" style={{ color: FORECAST_COLOR, opacity: 0.7 }}>
                        Prognose vom {format(parseISO(h.snapDate), 'dd.MM.', { locale: de })}: {h.value} kg
                      </p>
                    ))}
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

            {/* Historical forecast overlay lines */}
            {showHistory && filteredSnapshots.map((snap, idx) => {
              const opacity = 0.4 - (idx * 0.025); // newest=0.4, fading
              return (
                <Line
                  key={`history-${snap.id}`}
                  type="monotone"
                  dataKey={`history_${idx}`}
                  stroke={FORECAST_COLOR}
                  strokeWidth={1.2}
                  strokeOpacity={Math.max(opacity, 0.12)}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  animationDuration={800}
                />
              );
            })}

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
            {/* Forecast sharp line (trend) */}
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
            {/* Forecast simulated oscillation line */}
            {showForecastVisuals && (
              <Line
                type="monotone"
                dataKey="forecastSimulated"
                stroke={FORECAST_COLOR}
                strokeWidth={1.2}
                strokeOpacity={0.5}
                dot={false}
                connectNulls
                animationDuration={1800}
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
          {showHistory && filteredSnapshots.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: FORECAST_COLOR, opacity: 0.4 }} />
              <span style={{ color: FORECAST_COLOR, opacity: 0.6 }}>Alte Prognosen ({filteredSnapshots.length})</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
