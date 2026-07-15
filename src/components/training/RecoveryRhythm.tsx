import { useMemo } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import { cn } from '@/lib/utils';
import type { TrainingCheckin } from '@/lib/training/types';
import {
  dailyRhythm,
  medianRestGap,
  longestGapWithinRange,
  currentGap,
} from '@/lib/training/analytics';
import type { Period } from '@/lib/health/periods';
import { parseLocalDate } from '@/lib/health/periods';

interface Props {
  checkins: TrainingCheckin[];
  range: Period;
  referenceDate: Date;
}

function fmtDate(iso: string): string {
  const d = parseLocalDate(iso);
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function fmtShort(iso: string): string {
  const d = parseLocalDate(iso);
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d);
}

export function RecoveryRhythm({ checkins, range, referenceDate }: Props) {
  const rangeCheckins = useMemo(
    () => checkins.filter(c => {
      const d = parseLocalDate(c.checkin_date).getTime();
      return d >= range.start.getTime() && d <= range.end.getTime();
    }),
    [checkins, range],
  );

  const rangeDays = Math.max(30, Math.min(60, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000)));
  const timeline = useMemo(() => dailyRhythm(rangeCheckins, rangeDays, referenceDate), [rangeCheckins, rangeDays, referenceDate]);

  const median = useMemo(() => medianRestGap(rangeCheckins), [rangeCheckins]);
  const longest = useMemo(() => longestGapWithinRange(rangeCheckins, range), [rangeCheckins, range]);
  const gapNow = useMemo(() => currentGap(rangeCheckins, referenceDate), [rangeCheckins, referenceDate]);

  const gapAlert = median && gapNow && gapNow.vsMedian != null && gapNow.vsMedian >= 2;

  return (
    <ChartFrame
      eyebrow="Recovery Rhythm"
      title="Abstände zwischen Trainingstagen"
      caption={`Letzte ${timeline.length} Tage bis ${fmtShort(timeline[timeline.length - 1]?.date ?? '')}`}
      methodology="Zeigt die Sequenz der letzten Kalendertage: dunkle Marker sind Trainingstage, helle Marker Pausentage. Der Median der Pausen ist die zentrale Kennzahl für dein persönliches Muster. Diese Sicht macht keine medizinische Aussage zur Regeneration, weil keine Intensitätsdaten vorliegen."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            label="Typischer Abstand"
            value={median != null ? `${median.toFixed(median % 1 ? 1 : 0)} Tage` : '–'}
            hint="Median der Pausen"
          />
          <StatTile
            label="Längste Lücke"
            value={longest ? `${longest.days} Tage` : '–'}
            hint={longest ? `${fmtShort(longest.from)} → ${fmtShort(longest.to)}` : 'im Zeitraum'}
          />
          <StatTile
            label="Aktuelle Lücke"
            value={gapNow ? `${gapNow.days} Tage` : '–'}
            hint={
              gapNow?.vsMedian != null
                ? `${gapNow.vsMedian.toFixed(1)}× Median`
                : 'seit letztem Check-in'
            }
            tone={gapAlert ? 'warning' : 'default'}
          />
        </div>

        <div>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(6px, 1fr))` }}
            role="img"
            aria-label={`${timeline.filter(d => d.trained).length} Trainingstage in ${timeline.length} Tagen`}
          >
            {timeline.map((d) => (
              <div
                key={d.date}
                className={cn(
                  'h-8 rounded-sm transition-transform hover:scale-y-110',
                  d.trained ? 'bg-health-observed' : 'bg-health-hairline/60',
                )}
                title={`${fmtDate(d.date)} · ${d.trained ? `${d.visits} Check-in${d.visits === 1 ? '' : 's'}` : 'Pause'}`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] tabular-nums text-health-ink-subtle">
            <span>{fmtShort(timeline[0]?.date ?? '')}</span>
            <span>{fmtShort(timeline[timeline.length - 1]?.date ?? '')}</span>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-health-ink-subtle">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2 w-3 rounded-sm bg-health-observed" /> Trainingstag
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2 w-3 rounded-sm bg-health-hairline/60" /> Pause
            </span>
          </div>
        </div>

        {gapAlert && gapNow && (
          <p className="rounded-xl border border-health-warning/30 bg-health-warning/5 px-3 py-2 text-xs text-health-ink">
            Deine aktuelle Lücke ist ungewöhnlich lang gegenüber deinem Median von {median?.toFixed(median! % 1 ? 1 : 0)} Tagen.
          </p>
        )}
      </div>
    </ChartFrame>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        tone === 'warning'
          ? 'border-health-warning/30 bg-health-warning/5'
          : 'border-health-hairline bg-health-canvas/40',
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-health-ink-subtle">{label}</div>
      <div className="mt-1 font-health text-lg font-semibold tabular-nums text-health-ink">{value}</div>
      <div className="mt-0.5 text-[11px] text-health-ink-muted">{hint}</div>
    </div>
  );
}
