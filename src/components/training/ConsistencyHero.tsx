import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartFrame } from '@/components/health/ChartFrame';
import type { CompletedWeekBucket, TrainingAnnotation } from '@/lib/training/analytics';

interface Props {
  weeks: CompletedWeekBucket[];
  target?: number | null;
  annotations: TrainingAnnotation[];
  headline: {
    active: string;
    goalRate: string;
    trend: string;
  };
}

function fmtWeekLabel(w: CompletedWeekBucket): string {
  const d = w.weekStart;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

function TooltipCard({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-health-hairline bg-health-surface-elevated px-3 py-2 text-xs shadow-health-hero">
      <div className="font-medium text-health-ink">{row.tooltipTitle}</div>
      <dl className="mt-1 space-y-0.5 text-health-ink-muted">
        <div className="flex justify-between gap-6">
          <dt>Aktive Tage</dt>
          <dd className="tabular-nums text-health-ink">{row.activeDays}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt>Check-ins</dt>
          <dd className="tabular-nums text-health-ink">{row.visits}</dd>
        </div>
        {row.avg != null && (
          <div className="flex justify-between gap-6">
            <dt>4-Wochen-Ø</dt>
            <dd className="tabular-nums text-health-ink">{row.avg.toFixed(1)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-6 pt-1">
          <dt>Status</dt>
          <dd className="text-health-ink">{row.goalStatus}</dd>
        </div>
      </dl>
    </div>
  );
}

interface ChartRow {
  key: string;
  label: string;
  visits: number;
  activeDays: number;
  isCurrent: boolean;
  inGoal: boolean | null;
  avg: number | null;
  tooltipTitle: string;
  goalStatus: string;
  annotation?: string;
}

export function ConsistencyHero({ weeks, target, annotations, headline }: Props) {
  const data: ChartRow[] = useMemo(() => {
    const ann = new Map(annotations.map(a => [a.weekKey, a.label] as const));
    return weeks.map((w, i) => {
      const window = weeks.slice(Math.max(0, i - 3), i + 1).filter(x => !x.isCurrent);
      const avg = window.length ? window.reduce((s, x) => s + x.activeDays, 0) / window.length : null;
      const status = w.isCurrent
        ? 'Laufende Woche'
        : target
          ? w.activeDays >= target
            ? 'Im Ziel'
            : 'Unter Ziel'
          : `${w.activeDays} aktive Tage`;
      return {
        key: w.key,
        label: fmtWeekLabel(w),
        visits: w.visits,
        activeDays: w.activeDays,
        isCurrent: w.isCurrent,
        inGoal: w.inGoal,
        avg: avg ? Math.round(avg * 10) / 10 : null,
        tooltipTitle: `Woche vom ${fmtWeekLabel(w)}`,
        goalStatus: status,
        annotation: ann.get(w.key),
      };
    });
  }, [weeks, target, annotations]);

  const yMax = Math.max(
    (target ?? 0) + 1,
    ...data.map(d => d.activeDays),
    3,
  );

  const srSummary = `Konsistenz-Zeitreihe über ${data.length} Wochen. ${headline.active}. ${headline.goalRate}. ${headline.trend}.`;

  return (
    <ChartFrame
      eyebrow="Consistency"
      title="Trainingsfrequenz über abgeschlossene Wochen"
      caption={`${headline.active} · ${headline.goalRate} · ${headline.trend}`}
      methodology="Zählt aktive Trainingstage pro ISO-Woche. Mehrere Check-ins am selben Tag zählen als ein aktiver Tag. Der gestrichelte Balken markiert die laufende, unvollständige Woche und fließt nicht in die Zielquote ein. Die feine Linie zeigt den 4-Wochen-Mittelwert der aktiven Tage; sie berücksichtigt nur abgeschlossene Wochen."
    >
      <span className="sr-only">{srSummary}</span>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 12, bottom: 8, left: -12 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--health-ink-subtle))' }}
              axisLine={{ stroke: 'hsl(var(--health-hairline))' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--health-ink-subtle))' }}
              axisLine={false}
              tickLine={false}
              width={40}
              allowDecimals={false}
              domain={[0, yMax]}
            />
            {target ? (
              <ReferenceLine
                y={target}
                stroke="hsl(var(--health-ink-subtle))"
                strokeDasharray="4 4"
                label={{
                  value: `Ziel ${target}/Wo`,
                  position: 'right',
                  fill: 'hsl(var(--health-ink-subtle))',
                  fontSize: 10,
                }}
              />
            ) : null}
            <Tooltip content={<TooltipCard />} cursor={{ fill: 'hsl(var(--health-hairline) / 0.4)' }} />
            <Bar dataKey="activeDays" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((row) => {
                const fill = row.isCurrent
                  ? 'hsl(var(--health-ink-subtle))'
                  : row.inGoal === true
                    ? 'hsl(var(--health-positive))'
                    : row.inGoal === false
                      ? 'hsl(var(--health-warning))'
                      : 'hsl(var(--health-observed))';
                return (
                  <Cell
                    key={row.key}
                    fill={fill}
                    fillOpacity={row.isCurrent ? 0.35 : 0.9}
                    stroke={row.isCurrent ? 'hsl(var(--health-ink-subtle))' : 'transparent'}
                    strokeDasharray={row.isCurrent ? '3 3' : undefined}
                  />
                );
              })}
            </Bar>
            <Line
              type="monotone"
              dataKey="avg"
              stroke="hsl(var(--health-ink))"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {annotations.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-health-ink-muted">
          {annotations.map(a => (
            <li key={a.weekKey + a.kind} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={
                  a.kind === 'best'
                    ? 'inline-block h-1.5 w-1.5 rounded-full bg-health-positive'
                    : a.kind === 'gap'
                      ? 'inline-block h-1.5 w-1.5 rounded-full bg-health-warning'
                      : 'inline-block h-1.5 w-1.5 rounded-full bg-health-observed'
                }
              />
              {a.label}
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}
