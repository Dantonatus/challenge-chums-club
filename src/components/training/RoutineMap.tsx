import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import { cn } from '@/lib/utils';
import type { TrainingCheckin } from '@/lib/training/types';
import {
  routineHeatmap,
  trainingHourDomain,
  preferredTrainingWindow,
} from '@/lib/training/analytics';
import { parseLocalDate } from '@/lib/health/periods';
import { Sparkles } from 'lucide-react';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  checkins: TrainingCheckin[];
}

function fmtHour(h: number): string {
  const hh = Math.floor(h);
  return `${String(hh).padStart(2, '0')}:00`;
}

function fmtHourRange(a: number, b: number): string {
  const toStr = (x: number) => {
    const hh = Math.floor(x);
    const mm = Math.round((x - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  return `${toStr(a)}–${toStr(b)}`;
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
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = minH; h < maxH; h++) arr.push(h);
    return arr.length ? arr : [8, 9, 10];
  }, [minH, maxH]);

  const cells = useMemo(() => routineHeatmap(filtered), [filtered]);
  const cellMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(`${c.weekdayIdx}|${c.hour}`, c.count);
    return m;
  }, [cells]);

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

  return (
    <ChartFrame
      eyebrow="Routine Map"
      title="Wann trainierst du zuverlässig?"
      caption={dateRangeSample ? `Verteilung im gewählten Zeitraum (${dateRangeSample})` : 'Verteilung im gewählten Zeitraum'}
      methodology="Zählt Check-ins pro Wochentag und ganzer Stunde. Die Farbintensität skaliert linear zur häufigsten Zelle. Die Zeitachse wird auf die tatsächlich genutzte Spanne plus 60 Minuten Rand beschränkt, um leere Randstunden zu vermeiden. Zeitzone: lokale Zeit des Check-ins."
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
      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0 overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid" style={{ gridTemplateColumns: `40px repeat(${hours.length}, minmax(28px, 1fr))` }}>
              <div />
              {hours.map(h => (
                <div key={h} className="pb-1 text-center text-[10px] tabular-nums text-health-ink-subtle">
                  {fmtHour(h)}
                </div>
              ))}
              {DAYS.map((day, di) => (
                <div key={day} className="contents">
                  <div className="flex items-center pr-2 text-[11px] font-medium text-health-ink-muted">
                    {day}
                  </div>
                  {hours.map(h => {
                    const count = cellMap.get(`${di}|${h}`) || 0;
                    const intensity = maxCount ? count / maxCount : 0;
                    return (
                      <div
                        key={h}
                        className={cn(
                          'group relative m-[2px] flex aspect-square min-h-[24px] items-center justify-center rounded-md border transition-colors',
                          count === 0
                            ? 'border-health-hairline/40 bg-transparent'
                            : 'border-transparent',
                        )}
                        style={
                          count > 0
                            ? { backgroundColor: `hsl(var(--health-observed) / ${0.15 + intensity * 0.7})` }
                            : undefined
                        }
                        title={`${day} ${fmtHour(h)} – ${count} Check-in${count === 1 ? '' : 's'}`}
                        aria-label={`${day} ${fmtHour(h)}: ${count} Check-ins`}
                      >
                        {count > 0 && (
                          <span className="text-[10px] font-medium tabular-nums text-health-canvas">
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-health-ink-subtle">
              <span>Weniger</span>
              <div className="flex gap-0.5">
                {[0.2, 0.4, 0.6, 0.8, 1].map(v => (
                  <div
                    key={v}
                    className="h-2.5 w-4 rounded-sm"
                    style={{ backgroundColor: `hsl(var(--health-observed) / ${v})` }}
                  />
                ))}
              </div>
              <span>Häufiger</span>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-health-hairline bg-health-canvas/40 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-health-ink-subtle">
            <Sparkles className="h-3 w-3" /> Verlässlichstes Fenster
          </div>
          {window ? (
            <>
              <div className="font-health text-sm font-semibold text-health-ink">
                {window.weekdayLabel} · {fmtHourRange(window.hourStart, window.hourEnd)}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-health-ink-muted">
                {window.count} Check-in{window.count === 1 ? '' : 's'} in diesem 90-Minuten-Fenster – dein
                häufigstes Trainingsmuster im gewählten Zeitraum.
              </p>
            </>
          ) : (
            <p className="text-xs text-health-ink-muted">
              Noch zu wenige Check-ins, um ein verlässliches Fenster zu erkennen.
            </p>
          )}
        </aside>
      </div>
    </ChartFrame>
  );
}
