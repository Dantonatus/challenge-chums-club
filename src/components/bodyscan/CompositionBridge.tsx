import { useMemo } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import { cn } from '@/lib/utils';
import type { CompositionBridge } from '@/lib/bodyscan/analytics';

interface Props {
  bridge: CompositionBridge;
  baselineLabel: string;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function signed(n: number, digits = 1): string {
  return `${n >= 0 ? '+' : ''}${fmt(n, digits)}`;
}

interface Segment {
  x: number;
  width: number;
  yTop: number;
  yBottom: number;
  fill: string;
  label: string;
  value: string;
  isAnchor: boolean;
}

export function CompositionBridge({ bridge, baselineLabel }: Props) {
  const width = 640;
  const height = 260;
  const padL = 60, padR = 60, padT = 30, padB = 60;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const segments: Segment[] = useMemo(() => {
    if (!bridge.available || !bridge.steps.length) return [];
    const cumulatives = bridge.steps.map(s => s.cumulative);
    const min = Math.min(...cumulatives) - 1;
    const max = Math.max(...cumulatives) + 1;
    const span = max - min || 1;
    const stepW = chartW / bridge.steps.length;

    const y = (v: number) => padT + chartH - ((v - min) / span) * chartH;

    return bridge.steps.map((s, i) => {
      const x = padL + i * stepW + stepW * 0.15;
      const w = stepW * 0.7;
      let yTop: number, yBottom: number;
      if (s.kind === 'anchor') {
        yTop = y(s.cumulative);
        yBottom = padT + chartH;
      } else {
        const prev = bridge.steps[i - 1].cumulative;
        const top = Math.max(prev, s.cumulative);
        const bot = Math.min(prev, s.cumulative);
        yTop = y(top);
        yBottom = y(bot);
      }
      const fill =
        s.kind === 'anchor'
          ? 'hsl(var(--health-ink-subtle))'
          : s.kind === 'positive'
            ? 'hsl(var(--health-warning))'
            : 'hsl(var(--health-positive))';
      const value =
        s.kind === 'anchor' ? `${fmt(s.value)} kg` : `${signed(s.value)} kg`;
      return { x, width: w, yTop, yBottom, fill, label: s.label, value, isAnchor: s.kind === 'anchor' };
    });
  }, [bridge, chartW, chartH]);

  if (!bridge.available) {
    return (
      <ChartFrame
        eyebrow="Composition Bridge"
        title="Woraus besteht die Gewichtsveränderung?"
        methodology="ΔGewicht = ΔFettmasse + Δfettfreie Masse. Muskelmasse ist Teilmenge der fettfreien Masse und wird deshalb nicht als eigener Bridge-Balken addiert."
      >
        <p className="rounded-xl border border-dashed border-health-hairline bg-health-canvas/30 p-6 text-center text-sm text-health-ink-muted">
          {bridge.reason ?? 'Nicht genug Kernfelder, um die Zerlegung sicher zu berechnen.'}
        </p>
      </ChartFrame>
    );
  }

  const deltas = [
    { label: 'Δ Gewicht', value: bridge.weightDelta, unit: 'kg' },
    { label: 'Δ Fettmasse', value: bridge.fatDelta ?? 0, unit: 'kg' },
    { label: 'Δ fettfreie Masse', value: bridge.ffmDelta ?? 0, unit: 'kg' },
  ];

  return (
    <ChartFrame
      eyebrow="Composition Bridge"
      title="Woraus besteht die Gewichtsveränderung?"
      caption={baselineLabel}
      methodology={`ΔGewicht = ΔFettmasse + Δfettfreie Masse. Fettfreie Masse berechnet sich aus Gewicht minus Fettmasse. Muskelmasse ist Teilmenge der fettfreien Masse und wird deshalb nicht als eigener Bridge-Balken addiert – dies vermeidet Doppelzählungen.\n\nBIA-Werte können durch Hydration, Tageszeit und Messposition schwanken. Sehr kleine Änderungen (< 0,5 kg) sollten daher zurückhaltend interpretiert werden.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Waterfall der Gewichtszusammensetzung">
            <line
              x1={padL}
              x2={width - padR}
              y1={height - padB}
              y2={height - padB}
              stroke="hsl(var(--health-hairline))"
              strokeWidth={1}
            />
            {segments.map((s, i) => {
              const h = Math.max(2, s.yBottom - s.yTop);
              return (
                <g key={i}>
                  <rect
                    x={s.x}
                    y={s.yTop}
                    width={s.width}
                    height={h}
                    fill={s.fill}
                    fillOpacity={s.isAnchor ? 0.35 : 0.85}
                    rx={4}
                  />
                  <text
                    x={s.x + s.width / 2}
                    y={s.yTop - 8}
                    textAnchor="middle"
                    className="fill-health-ink"
                    style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}
                  >
                    {s.value}
                  </text>
                  <text
                    x={s.x + s.width / 2}
                    y={height - padB + 18}
                    textAnchor="middle"
                    className="fill-health-ink-subtle"
                    style={{ fontSize: 10 }}
                  >
                    {s.label}
                  </text>
                </g>
              );
            })}
            {/* Verbindungslinien zwischen Anchor→Delta→Anchor */}
            {segments.slice(0, -1).map((s, i) => {
              const next = segments[i + 1];
              const y = next.isAnchor ? next.yTop : (segments[i].isAnchor ? segments[i].yTop : Math.min(s.yTop, next.yTop));
              return (
                <line
                  key={`ln-${i}`}
                  x1={s.x + s.width}
                  x2={next.x}
                  y1={s.isAnchor ? s.yTop : Math.min(s.yTop, next.yTop)}
                  y2={next.isAnchor ? next.yTop : Math.min(s.yTop, next.yTop)}
                  stroke="hsl(var(--health-ink-subtle))"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              );
            })}
          </svg>
        </div>

        <aside className="space-y-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-health-ink-subtle">
            Was hat sich verändert?
          </div>
          <ul className="space-y-2">
            {deltas.map(d => {
              const positive = d.value > 0;
              return (
                <li
                  key={d.label}
                  className="flex items-baseline justify-between rounded-xl border border-health-hairline bg-health-canvas/40 px-3 py-2"
                >
                  <span className="text-xs text-health-ink-muted">{d.label}</span>
                  <span
                    className={cn(
                      'font-health text-base font-semibold tabular-nums',
                      d.label === 'Δ Fettmasse'
                        ? positive
                          ? 'text-health-warning'
                          : 'text-health-positive'
                        : d.label === 'Δ fettfreie Masse'
                          ? positive
                            ? 'text-health-positive'
                            : 'text-health-warning'
                          : 'text-health-ink',
                    )}
                  >
                    {signed(d.value)} {d.unit}
                  </span>
                </li>
              );
            })}
          </ul>
          {bridge.muscleHint != null && (
            <p className="text-[11px] leading-relaxed text-health-ink-subtle">
              Zusatzhinweis: Muskelmasse allein änderte sich um {signed(bridge.muscleHint)} kg. Muskelmasse ist Teil
              der fettfreien Masse und wird oben nicht doppelt gezählt.
            </p>
          )}
        </aside>
      </div>
    </ChartFrame>
  );
}
