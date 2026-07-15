import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import type { TrainingCheckin } from '@/lib/training/types';
import {
  routineHeatmap,
  trainingHourDomain,
  preferredTrainingWindow,
} from '@/lib/training/analytics';
import { parseLocalDate } from '@/lib/health/periods';

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

  // Responsive width
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
  const rowHeight = isNarrow ? 48 : 64;
  const marginLeft = isNarrow ? 44 : 60;
  const marginRight = 24;
  const marginTop = 24;
  const marginBottom = 40;

  const plotWidth = Math.max(200, width - marginLeft - marginRight);
  const plotHeight = rowHeight * 7;
  const svgHeight = plotHeight + marginTop + marginBottom;

  const xFor = (hour: number) => marginLeft + ((hour + 0.5 - minH) / hoursSpan) * plotWidth;
  const yFor = (dow: number) => marginTop + dow * rowHeight + rowHeight / 2;

  const rMax = Math.min(rowHeight * 0.42, (plotWidth / hoursSpan) * 0.48);
  const rMin = 4;
  const radiusFor = (count: number) => {
    if (maxCount <= 0) return rMin;
    const ratio = count / maxCount;
    return rMin + (rMax - rMin) * Math.sqrt(ratio);
  };

  const hourStep = hoursSpan > 14 ? 3 : hoursSpan > 8 ? 2 : 1;
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      if ((h - minH) % hourStep === 0) ticks.push(h);
    }
    return ticks;
  }, [minH, maxH, hourStep]);

  const [hover, setHover] = useState<HoverCell | null>(null);
  const nonZero = cells.filter(c => c.count > 0);

  // Per-day totals (for right-rail context)
  const dayTotals = useMemo(() => {
    const t = [0, 0, 0, 0, 0, 0, 0];
    for (const c of cells) t[c.weekdayIdx] += c.count;
    return t;
  }, [cells]);
  const maxDayTotal = Math.max(1, ...dayTotals);

  const preferredCenterX = window
    ? marginLeft + (((window.hourStart + window.hourEnd) / 2 - minH) / hoursSpan) * plotWidth
    : 0;
  const preferredWidthPx = window
    ? ((window.hourEnd - window.hourStart) / hoursSpan) * plotWidth
    : 0;

  return (
    <ChartFrame
      eyebrow="Routine Map"
      title="Wann trainierst du zuverlässig?"
      caption={
        dateRangeSample
          ? `Wochentag × Stunde · Größe zeigt Häufigkeit · ${dateRangeSample}`
          : 'Wochentag × Stunde · Größe zeigt Häufigkeit'
      }
      methodology="Jede Bubble steht für eine (Wochentag × Stunde)-Kombination. Die Fläche des Kreises skaliert mit der Wurzel der Check-in-Anzahl, damit Verhältnisse visuell korrekt wahrnehmbar bleiben. Die Zeitachse ist auf die tatsächlich genutzte Spanne plus 60 Minuten Rand beschränkt. Die vertikale Lichtsäule markiert das 90-Minuten-Fenster mit den meisten Check-ins. Zeitzone: lokale Zeit des Check-ins."
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
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-health-canvas/80 via-health-canvas/60 to-transparent"
      >
        {nonZero.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-health-ink-muted">
            Noch keine Trainings im gewählten Zeitraum.
          </div>
        ) : (
          <>
            {/* Floating context chip (top-right, inside plot area) */}
            {window && (
              <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-health-hairline/70 bg-health-surface/85 px-3 py-1 text-[11px] font-medium text-health-ink shadow-sm backdrop-blur-md">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-health-observed opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-health-observed" />
                </span>
                <span className="text-health-ink-muted">Peak</span>
                <span className="tabular-nums">
                  {window.weekdayLabel} · {fmtHour(window.hourStart)}–{fmtHour(window.hourEnd)}
                </span>
              </div>
            )}

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
                {/* Core orb: sharp center, soft edge */}
                <radialGradient id="orb-core" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--health-observed))" stopOpacity="1" />
                  <stop offset="60%" stopColor="hsl(var(--health-observed))" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="hsl(var(--health-observed))" stopOpacity="0.65" />
                </radialGradient>
                {/* Outer bloom */}
                <radialGradient id="orb-bloom" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--health-observed))" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="hsl(var(--health-observed))" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="hsl(var(--health-observed))" stopOpacity="0" />
                </radialGradient>
                {/* Preferred window column */}
                <linearGradient id="peak-column" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--health-observed))" stopOpacity="0" />
                  <stop offset="20%" stopColor="hsl(var(--health-observed))" stopOpacity="0.08" />
                  <stop offset="80%" stopColor="hsl(var(--health-observed))" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="hsl(var(--health-observed))" stopOpacity="0" />
                </linearGradient>
                {/* Bloom filter for hovered orb */}
                <filter id="orb-hover-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>

              {/* Peak window column (full plot height) */}
              {window && preferredWidthPx > 0 && (
                <>
                  <rect
                    x={preferredCenterX - preferredWidthPx / 2}
                    y={marginTop}
                    width={preferredWidthPx}
                    height={plotHeight}
                    fill="url(#peak-column)"
                    rx={preferredWidthPx / 2}
                  />
                  <line
                    x1={preferredCenterX}
                    x2={preferredCenterX}
                    y1={marginTop}
                    y2={marginTop + plotHeight}
                    stroke="hsl(var(--health-observed) / 0.35)"
                    strokeWidth={1}
                    strokeDasharray="2 4"
                  />
                </>
              )}

              {/* Hairline hour separators – ultra subtle */}
              {hourTicks.map(h => {
                const x = marginLeft + ((h - minH) / hoursSpan) * plotWidth;
                return (
                  <line
                    key={`grid-${h}`}
                    x1={x}
                    x2={x}
                    y1={marginTop + 2}
                    y2={marginTop + plotHeight - 2}
                    stroke="hsl(var(--health-hairline) / 0.28)"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Y-axis day labels + subtle count badge */}
              {DAYS.map((d, di) => {
                const total = dayTotals[di];
                const isHovered = hover?.weekdayIdx === di;
                return (
                  <g key={`ylabel-${di}`} opacity={total === 0 ? 0.35 : 1}>
                    <text
                      x={marginLeft - 14}
                      y={yFor(di) - 1}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill={isHovered ? 'hsl(var(--health-ink))' : 'hsl(var(--health-ink-muted))'}
                      fontSize={isNarrow ? 11 : 12}
                      fontWeight={600}
                      style={{ letterSpacing: '0.06em', transition: 'fill 160ms' }}
                    >
                      {d.toUpperCase()}
                    </text>
                    <text
                      x={marginLeft - 14}
                      y={yFor(di) + (isNarrow ? 11 : 12)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="hsl(var(--health-ink-subtle))"
                      fontSize={isNarrow ? 9 : 10}
                      fontWeight={500}
                      className="tabular-nums"
                    >
                      {total > 0 ? total : ''}
                    </text>
                  </g>
                );
              })}

              {/* X-axis hour labels */}
              {hourTicks.map(h => {
                const x = marginLeft + ((h - minH) / hoursSpan) * plotWidth;
                const isPeak = window && h >= Math.floor(window.hourStart) && h <= Math.ceil(window.hourEnd);
                return (
                  <text
                    key={`xlabel-${h}`}
                    x={x}
                    y={marginTop + plotHeight + 22}
                    textAnchor="middle"
                    fill={isPeak ? 'hsl(var(--health-observed))' : 'hsl(var(--health-ink-subtle))'}
                    fontSize={isNarrow ? 10 : 11}
                    fontWeight={isPeak ? 600 : 500}
                    className="tabular-nums"
                  >
                    {String(h).padStart(2, '0')}
                  </text>
                );
              })}
              <text
                x={marginLeft + plotWidth / 2}
                y={svgHeight - 4}
                textAnchor="middle"
                fill="hsl(var(--health-ink-subtle))"
                fontSize={9}
                fontWeight={500}
                style={{ letterSpacing: '0.14em' }}
              >
                STUNDE
              </text>

              {/* Bloom layer (behind orbs) — creates the "atmosphere" */}
              <g>
                {nonZero.map(c => {
                  const cx = xFor(c.hour);
                  const cy = yFor(c.weekdayIdx);
                  const r = radiusFor(c.count);
                  const isActive = hover?.weekdayIdx === c.weekdayIdx && hover?.hour === c.hour;
                  const bloomR = (isActive ? r * 1.15 : r) * 2.6;
                  return (
                    <circle
                      key={`bloom-${c.weekdayIdx}-${c.hour}`}
                      cx={cx}
                      cy={cy}
                      r={bloomR}
                      fill="url(#orb-bloom)"
                      opacity={hover && !isActive ? 0.35 : 1}
                      style={{ transition: 'opacity 200ms, r 200ms ease-out' }}
                    />
                  );
                })}
              </g>

              {/* Orbs */}
              {nonZero.map(c => {
                const cx = xFor(c.hour);
                const cy = yFor(c.weekdayIdx);
                const r = radiusFor(c.count);
                const isActive = hover?.weekdayIdx === c.weekdayIdx && hover?.hour === c.hour;
                const displayR = isActive ? r * 1.15 : r;
                const dimmed = hover && !isActive;
                return (
                  <g
                    key={`orb-${c.weekdayIdx}-${c.hour}`}
                    style={{ cursor: 'pointer' }}
                    tabIndex={0}
                    role="img"
                    aria-label={`${DAYS_LONG[c.weekdayIdx]} ${String(c.hour).padStart(2, '0')}:00 Uhr: ${c.count} Check-in${c.count === 1 ? '' : 's'}`}
                    onMouseEnter={() =>
                      setHover({ weekdayIdx: c.weekdayIdx, hour: c.hour, count: c.count, cx, cy, r: displayR })
                    }
                    onMouseLeave={() => setHover(null)}
                    onFocus={() =>
                      setHover({ weekdayIdx: c.weekdayIdx, hour: c.hour, count: c.count, cx, cy, r: displayR })
                    }
                    onBlur={() => setHover(null)}
                    opacity={dimmed ? 0.32 : 1}
                    style-transition="opacity 200ms"
                  >
                    {/* Active concentric ring */}
                    {isActive && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={displayR + 6}
                        fill="none"
                        stroke="hsl(var(--health-observed) / 0.5)"
                        strokeWidth={1}
                      />
                    )}
                    {/* Core orb */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={displayR}
                      fill="url(#orb-core)"
                      style={{ transition: 'r 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    />
                    {/* Crisp rim */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={displayR}
                      fill="none"
                      stroke="hsl(var(--health-observed))"
                      strokeWidth={isActive ? 1.5 : 0.75}
                      opacity={isActive ? 1 : 0.7}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hover && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-health-hairline/60 bg-health-canvas/95 pl-3 pr-4 py-2.5 shadow-2xl backdrop-blur-xl animate-fade-in"
                style={{
                  left: hover.cx,
                  top: hover.cy - hover.r - 12,
                  minWidth: 180,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 h-full w-0.5 min-h-[32px] rounded-full bg-health-observed" />
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-health-ink-subtle">
                      {DAYS_LONG[hover.weekdayIdx]}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-health-ink">
                      {String(hover.hour).padStart(2, '0')}:00 – {String(hover.hour + 1).padStart(2, '0')}:00
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold leading-none tabular-nums text-health-observed">
                        {hover.count}
                      </span>
                      <span className="text-xs text-health-ink-muted">
                        Check-in{hover.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-health-ink-subtle">
                      {hover.count === maxCount ? 'Häufigstes Fenster' : `${Math.round((hover.count / maxCount) * 100)}% des Peaks`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Day totals rail (bottom) */}
      {nonZero.length > 0 && (
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {DAYS.map((d, di) => {
            const total = dayTotals[di];
            const pct = total / maxDayTotal;
            const isHovered = hover?.weekdayIdx === di;
            return (
              <div
                key={`total-${di}`}
                className={`flex flex-col items-center gap-1.5 rounded-lg px-1 py-1.5 transition-colors ${isHovered ? 'bg-health-observed/10' : ''}`}
              >
                <div className="h-1 w-full overflow-hidden rounded-full bg-health-hairline/40">
                  <div
                    className="h-full rounded-full bg-health-observed transition-all"
                    style={{ width: `${Math.max(pct * 100, total > 0 ? 8 : 0)}%`, opacity: 0.4 + pct * 0.6 }}
                  />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isHovered ? 'text-health-ink' : 'text-health-ink-subtle'}`}>
                    {d}
                  </span>
                  <span className="text-[10px] font-medium tabular-nums text-health-ink-muted">
                    {total || '–'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartFrame>
  );
}
