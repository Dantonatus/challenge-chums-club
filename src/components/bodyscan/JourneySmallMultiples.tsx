import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { ChartFrame } from '@/components/health/ChartFrame';
import type { BodyScan } from '@/lib/bodyscan/types';
import { formatGermanDate, computeTightDomain } from '@/lib/bodyscan/analytics';

interface Props {
  scans: BodyScan[];
  baseline: BodyScan | null;
  current: BodyScan;
}

interface MetricConfig {
  key: keyof BodyScan;
  label: string;
  unit: string;
  color: string;
  digits: number;
}

const METRICS: MetricConfig[] = [
  { key: 'weight_kg', label: 'Gewicht', unit: 'kg', color: 'hsl(var(--health-observed))', digits: 1 },
  { key: 'muscle_mass_kg', label: 'Muskelmasse', unit: 'kg', color: 'hsl(var(--health-positive))', digits: 1 },
  { key: 'fat_mass_kg', label: 'Fettmasse', unit: 'kg', color: 'hsl(var(--health-warning))', digits: 1 },
];

function signed(n: number, digits = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

interface Row {
  date: string;
  ts: number;
  label: string;
  [key: string]: string | number | null;
}

export function JourneySmallMultiples({ scans, baseline, current }: Props) {
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const data: Row[] = useMemo(() => {
    return scans.map(s => {
      const row: Row = {
        date: s.scan_date,
        ts: new Date(s.scan_date).getTime(),
        label: formatGermanDate(s.scan_date),
      };
      for (const m of METRICS) {
        row[m.key as string] = (s[m.key] as number | null) ?? null;
      }
      return row;
    });
  }, [scans]);

  return (
    <ChartFrame
      eyebrow="Journey"
      title="Verlauf der Kernwerte"
      caption="Drei synchronisierte Achsen mit eigener Einheit und Skala"
      methodology={`Jede Reihe hat eine eigene Y-Achse, weil Gewicht, Muskelmasse und Fettmasse unterschiedliche Größenordnungen haben. Die Achsen sind aus Sichtbarkeitsgründen auf den tatsächlichen Wertebereich gezoomt (mit dezentem Padding). Start- und Endpunkte sind markiert; Delta unter dem Titel bezieht sich auf den gewählten Vergleichsscan.\n\nEine gezoomte Skala kann kleine Änderungen visuell verstärken – die tabellarischen Deltas sind die belastbare Aussage.`}
    >
      <div className="space-y-4">
        {METRICS.map((m, idx) => (
          <SingleTrend
            key={m.key as string}
            metric={m}
            data={data}
            baseline={baseline}
            current={current}
            hoverDate={hoverDate}
            onHover={setHoverDate}
            showAxis={idx === METRICS.length - 1}
          />
        ))}
      </div>
    </ChartFrame>
  );
}

function SingleTrend({
  metric,
  data,
  baseline,
  current,
  hoverDate,
  onHover,
  showAxis,
}: {
  metric: MetricConfig;
  data: Row[];
  baseline: BodyScan | null;
  current: BodyScan;
  hoverDate: string | null;
  onHover: (d: string | null) => void;
  showAxis: boolean;
}) {
  const values = data.map(r => r[metric.key as string] as number | null);
  const domain = computeTightDomain(values, 0.15);

  const currentVal = (current[metric.key] as number | null) ?? null;
  const baselineVal = baseline ? ((baseline[metric.key] as number | null) ?? null) : null;
  const absDelta = currentVal != null && baselineVal != null ? currentVal - baselineVal : null;
  const pctDelta = absDelta != null && baselineVal ? (absDelta / baselineVal) * 100 : null;

  const firstNonNull = data.find(r => r[metric.key as string] != null);
  const lastNonNull = [...data].reverse().find(r => r[metric.key as string] != null);

  return (
    <div className="group rounded-xl border border-health-hairline bg-health-canvas/30 p-3">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: metric.color }}
          />
          <span className="text-sm font-medium text-health-ink">{metric.label}</span>
          <span className="text-xs text-health-ink-subtle">
            {firstNonNull ? `${(firstNonNull[metric.key as string] as number).toFixed(metric.digits)} ${metric.unit}` : '–'}
            {' → '}
            {lastNonNull ? `${(lastNonNull[metric.key as string] as number).toFixed(metric.digits)} ${metric.unit}` : '–'}
          </span>
        </div>
        {absDelta != null && (
          <div className="text-xs tabular-nums text-health-ink-muted">
            <span className="font-medium text-health-ink">{signed(absDelta, metric.digits)} {metric.unit}</span>
            {pctDelta != null && <span className="ml-1.5">({signed(pctDelta, 1)} %)</span>}
          </div>
        )}
      </div>
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, bottom: showAxis ? 20 : 4, left: 8 }}
            onMouseMove={(state) => {
              if (state && state.activePayload && state.activePayload[0]) {
                onHover((state.activePayload[0].payload as Row).date);
              }
            }}
            onMouseLeave={() => onHover(null)}
          >
            <XAxis
              dataKey="label"
              hide={!showAxis}
              tick={{ fontSize: 10, fill: 'hsl(var(--health-ink-subtle))' }}
              axisLine={{ stroke: 'hsl(var(--health-hairline))' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 10, fill: 'hsl(var(--health-ink-subtle))' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--health-ink-subtle))', strokeDasharray: '2 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const row = payload[0].payload as Row;
                const val = row[metric.key as string];
                return (
                  <div className="rounded-lg border border-health-hairline bg-health-surface-elevated px-2.5 py-1.5 text-[11px] shadow-health-hero">
                    <div className="font-medium text-health-ink">{row.label}</div>
                    <div className="tabular-nums text-health-ink-muted">
                      {val != null ? `${(val as number).toFixed(metric.digits)} ${metric.unit}` : '–'}
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey={metric.key as string}
              stroke={metric.color}
              strokeWidth={2}
              dot={{ r: 2, stroke: metric.color, fill: 'hsl(var(--health-surface))', strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
            {baseline && baselineVal != null && (
              <ReferenceDot
                x={formatGermanDate(baseline.scan_date)}
                y={baselineVal}
                r={4}
                fill="hsl(var(--health-surface))"
                stroke={metric.color}
                strokeWidth={2}
              />
            )}
            {hoverDate && (
              <ReferenceDot
                x={formatGermanDate(hoverDate)}
                y={values[data.findIndex(r => r.date === hoverDate)] ?? domain[0]}
                r={3}
                fill={metric.color}
                stroke="transparent"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
