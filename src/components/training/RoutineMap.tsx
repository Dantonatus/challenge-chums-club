import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import type { TrainingCheckin } from '@/lib/training/types';
import {
  routineHeatmap,
  trainingHourDomain,
  preferredTrainingWindow,
} from '@/lib/training/analytics';
import { parseLocalDate } from '@/lib/health/periods';
import { Sparkles } from 'lucide-react';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

interface Props {
  checkins: TrainingCheckin[];
}

function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

interface HoverCell {
  weekdayIdx: number;
  hour: number;
  count: number;
  cx: number;
  cy: number;
  r: number;
}

export function RoutineMap({ checkins }: Props) {
  const facilities = useMemo(() => {
    const set = new Set(checkins.map(c => c.facility_name).filter(Boolean));
    return Array.from(set).sort();
  }, [checkins]);

  const [facility, setFacility] = useState<string>('all');
  const filtered = useMemo(
    () => (facility === 'all' ? checkins : checkins.filter(c => c.facility_name === facility)),
    [checkins, facility],
  );

  const [minH, maxH] = useMemo(() => trainingHourDomain(filtered), [filtered]);
  const hoursSpan = Math.max(1, maxH - minH);

  const cells = useMemo(() => routineHeatmap(filtered), [filtered]);
  const maxCount = useMemo(() => cells.reduce((m, c) => (c.count > m ? c.count : m), 0), [cells]);
  const window = useMemo(() => preferredTrainingWindow(filtered), [filtered]);

  const dateRangeSample = useMemo(() => {
    const dates = filtered.map(c => parseLocalDate(c.checkin_date).getTime());
    if (!dates.length) return null;
    const first = new Date(Math.min(...dates));
    const last = new Date(Math.max(...dates));
    const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' });
    return `${fmt.format(first)} – ${fmt.format(last)}`;
  }, [filtered]);

  // Responsive width measurement
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(960);
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const isNarrow = width < 640;
  const rowHeight = isNarrow ? 44 : 60;
  const marginLeft = isNarrow ? 40 : 52;
  const marginRight = 20;
  const marginTop = 16;
  const marginBottom = 32;

  const plotWidth = Math.max(200, width - marginLeft - marginRight);
  const plotHeight = rowHeight * 7;
  const svgHeight = plotHeight + marginTop + marginBottom;

  // X scale: center hours at hour + 0.5 (mid of hour block)
  const xFor = (hour: number) => marginLeft + ((hour + 0.5 - minH) / hoursSpan) * plotWidth;
  const yFor = (dow: number) => marginTop + dow * rowHeight + rowHeight / 2;

  const rMax = Math.min(rowHeight * 0.44, (plotWidth / hoursSpan) * 0.48);
  const rMin = 5;
  const radiusFor = (count: number) => {
    if (maxCount <= 0) return rMin;
    const ratio = count / maxCount;
    return rMin + (rMax - rMin) * Math.sqrt(ratio);
  };

  // Hour ticks
  const hourStep = hoursSpan > 14 ? 3 : hoursSpan > 8 ? 2 : 1;
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      if ((h - minH) % hourStep === 0) ticks.push(h);
    }
    return ticks;
  }, [minH, maxH, hourStep]);

  const [hover, setHover] = useState<HoverCell | null>(null);

  // Legend reference values
  const legendValues = useMemo(() => {
    if (maxCount <= 1) return [1];
    if (maxCount <= 3) return [1, maxCount];
    if (maxCount <= 6) return [1, Math.ceil(maxCount / 2), maxCount];
    return [1, Math.ceil(maxCount / 3), Math.ceil((maxCount * 2) / 3), maxCount];
  }, [maxCount]);

  const nonZero = cells.filter(c => c.count > 0);

  return (
    <ChartFrame
      eyebrow="Routine Map"
      title="Wann trainierst du zuverlässig?"
      caption={
        dateRangeSample
          ? `Größe der Bubble = Anzahl Check-ins in dieser Stunde · ${dateRangeSample}`
          : 'Größe der Bubble = Anzahl Check-ins in dieser Stunde'
      }
      methodology="Jede Bubble steht für eine (Wochentag × Stunde)-Kombination. Die Fläche des Kreises skaliert mit der Wurzel der Check-in-Anzahl, damit Verhältnisse visuell korrekt wahrnehmbar bleiben. Die Zeitachse ist auf die tatsächlich genutzte Spanne plus 60 Minuten Rand beschränkt. Das hervorgehobene Band markiert das 90-Minuten-Fenster mit den meisten Check-ins. Zeitzone: lokale Zeit des Check-ins."
      action={
        facilities.length > 1 ? (
          <select
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            aria-label="Standort filtern"
            className="rounded-full border border-health-hairline bg-health-surface px-3 py-1 text-xs text-health-ink focus:outline-none focus:ring-1 focus:ring-health-observed"
          >
            <option value="all">Alle Standorte</option>
            {facilities.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        ) : null
      }
    >
      {window && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-health-hairline bg-health-canvas/60 px-3 py-1 text-[11px] text-health-ink-muted">
          <Sparkles className="h-3 w-3 text-health-observed" />
          <span className="font-medium text-health-ink">Verlässlichstes Fenster:</span>{' '}
          {window.weekdayLabel} · {fmtHour(window.hourStart)}–{fmtHour(window.hourEnd)}
          <span className="text-health-ink-subtle">· {window.count} Check-in{window.count === 1 ? '' : 's'}</span>
        </div>
      )}

      <div ref={containerRef} className="relative w-full">
        {nonZero.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-health-ink-muted">
            Noch keine Trainings im gewählten Zeitraum.
          </div>
        ) : (
          <>
            <svg
              width={width}
              height={svgHeight}
              viewBox={`0 0 ${width} ${svgHeight}`}
              className="block"
              role="img"
              aria-label="Bubble-Chart: Trainings-Check-ins nach Wochentag und Stunde"
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <filter id="routine-bubble-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Zebra rows */}
              {DAYS.map((_, di) => (
                <rect
                  key={`zebra-${di}`}
                  x={marginLeft}
                  y={marginTop + di * rowHeight}
                  width={plotWidth}
                  height={rowHeight}
                  fill={di % 2 === 0 ? 'hsl(var(--health-hairline) / 0.18)' : 'transparent'}
                />
              ))}

              {/* Preferred window band */}
              {window && (
                <rect
                  x={marginLeft + ((window.hourStart - minH) / hoursSpan) * plotWidth}
                  y={marginTop + window.weekdayIdx * rowHeight + 4}
                  width={((window.hourEnd - window.hourStart) / hoursSpan) * plotWidth}
                  height={rowHeight - 8}
                  fill="hsl(var(--health-observed) / 0.10)"
                  stroke="hsl(var(--health-observed) / 0.35)"
                  strokeDasharray="3 3"
                  rx={8}
                />
              )}

              {/* Vertical hour grid */}
              {hourTicks.map(h => {
                const x = marginLeft + ((h - minH) / hoursSpan) * plotWidth;
                return (
                  <line
                    key={`grid-${h}`}
                    x1={x}
                    x2={x}
                    y1={marginTop}
                    y2={marginTop + plotHeight}
                    stroke="hsl(var(--health-hairline) / 0.55)"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Y-axis day labels */}
              {DAYS.map((d, di) => (
                <text
                  key={`ylabel-${di}`}
                  x={marginLeft - 12}
                  y={yFor(di)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-health-ink-muted"
                  fontSize={isNarrow ? 11 : 12}
                  fontWeight={500}
                >
                  {d}
                </text>
              ))}

              {/* X-axis hour labels */}
              {hourTicks.map(h => {
                const x = marginLeft + ((h - minH) / hoursSpan) * plotWidth;
                return (
                  <text
                    key={`xlabel-${h}`}
                    x={x}
                    y={marginTop + plotHeight + 18}
                    textAnchor="middle"
                    className="fill-health-ink-subtle"
                    fontSize={isNarrow ? 10 : 11}
                  >
                    {String(h).padStart(2, '0')}:00
                  </text>
                );
              })}

              {/* Bubbles */}
              {nonZero.map(c => {
                const cx = xFor(c.hour);
                const cy = yFor(c.weekdayIdx);
                const r = radiusFor(c.count);
                const alpha = 0.35 + 0.55 * (maxCount ? c.count / maxCount : 0);
                const isActive =
                  hover && hover.weekdayIdx === c.weekdayIdx && hover.hour === c.hour;
                return (
                  <circle
                    key={`b-${c.weekdayIdx}-${c.hour}`}
                    cx={cx}
                    cy={cy}
                    r={isActive ? r * 1.08 : r}
                    fill={`hsl(var(--health-observed) / ${alpha})`}
                    stroke="hsl(var(--health-observed) / 0.95)"
                    strokeWidth={1.25}
                    style={{
                      cursor: 'pointer',
                      transition: 'r 120ms ease-out',
                      filter: isActive ? 'url(#routine-bubble-glow)' : undefined,
                    }}
                    tabIndex={0}
                    role="img"
                    aria-label={`${DAYS_LONG[c.weekdayIdx]} ${String(c.hour).padStart(2, '0')}:00 Uhr: ${c.count} Check-in${c.count === 1 ? '' : 's'}`}
                    onMouseEnter={() =>
                      setHover({ weekdayIdx: c.weekdayIdx, hour: c.hour, count: c.count, cx, cy, r })
                    }
                    onFocus={() =>
                      setHover({ weekdayIdx: c.weekdayIdx, hour: c.hour, count: c.count, cx, cy, r })
                    }
                    onBlur={() => setHover(null)}
                  />
                );
              })}
            </svg>

            {/* Tooltip */}
            {hover && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-health-hairline bg-health-canvas px-3 py-2 text-xs shadow-lg"
                style={{
                  left: hover.cx,
                  top: hover.cy - hover.r - 8,
                }}
              >
                <div className="font-medium text-health-ink">
                  {DAYS_LONG[hover.weekdayIdx]} · {String(hover.hour).padStart(2, '0')}:00–
                  {String(hover.hour + 1).padStart(2, '0')}:00
                </div>
                <div className="mt-0.5 text-health-ink-muted">
                  <span className="font-semibold text-health-observed">{hover.count}</span> Check-in
                  {hover.count === 1 ? '' : 's'}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-5 border-t border-health-hairline/60 pt-4">
              <span className="text-[11px] uppercase tracking-[0.14em] text-health-ink-subtle">
                Skala
              </span>
              {legendValues.map(v => {
                const r = radiusFor(v);
                const size = Math.max(12, r * 2);
                const alpha = 0.35 + 0.55 * (maxCount ? v / maxCount : 0);
                return (
                  <div key={v} className="flex items-center gap-2">
                    <svg width={size} height={size} className="block">
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill={`hsl(var(--health-observed) / ${alpha})`}
                        stroke="hsl(var(--health-observed) / 0.95)"
                        strokeWidth={1.25}
                      />
                    </svg>
                    <span className="text-xs tabular-nums text-health-ink-muted">
                      {v} {v === 1 ? 'Check-in' : 'Check-ins'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ChartFrame>
  );
}
