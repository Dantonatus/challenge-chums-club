import type { TrainingCheckin } from '@/lib/training/types';
import type { HealthGoal } from '@/hooks/useHealthGoal';
import type { Period } from '@/lib/health/periods';
import { formatPeriodLabel } from '@/lib/health/periods';
import {
  completedWeeklySeries,
  trainingGoalAttainment,
  rollingFrequencyChange,
  medianRestGap,
  longestGapWithinRange,
  preferredTrainingWindow,
} from '@/lib/training/analytics';
import type { ReportModel, LineChartSpec, BarChartSpec, KpiItem } from './types';
import { REPORT_COLORS, fmtDateDe, numDe, pctDe, signed } from './reportFormatting';

export function buildTrainingReportModel(params: {
  checkins: TrainingCheckin[];
  periodCheckins: TrainingCheckin[];
  period: Period;
  now: Date;
  goal: HealthGoal | null;
  updatedAt: Date | null;
}): ReportModel {
  const { periodCheckins, period, now, goal, updatedAt } = params;
  const weeklyGoal = goal?.weekly_training_target ?? null;

  const weeks = completedWeeklySeries(periodCheckins, period, now, weeklyGoal);
  const completed = weeks.filter(w => !w.isCurrent);
  const attainment = trainingGoalAttainment(weeks, weeklyGoal);
  const rolling = rollingFrequencyChange(completed.slice(-4), completed.slice(-8, -4));
  const gap = longestGapWithinRange(periodCheckins, period);
  const median = medianRestGap(periodCheckins);
  const window = preferredTrainingWindow(periodCheckins);
  const activeWeeks = completed.filter(w => w.activeDays > 0).length;

  const kpis: KpiItem[] = [
    { label: 'Check-ins', value: `${periodCheckins.length}` },
    { label: 'Aktive Wochen', value: `${activeWeeks} / ${completed.length}` },
    { label: 'Ø aktive Tage/Woche', value: numDe(rolling.currentAvg) },
    weeklyGoal
      ? {
          label: 'Zielquote',
          value: `${Math.round(attainment.rate * 100)} %`,
          hint: `${attainment.inGoal} / ${attainment.total} Wochen`,
        }
      : { label: 'Median Pause', value: median != null ? `${numDe(median, median % 1 ? 1 : 0)} Tage` : '–' },
  ];

  const change = rolling.deltaPct != null
    ? `Frequenz ${pctDe(rolling.deltaPct)} vs. Vorperiode (Ø ${numDe(rolling.currentAvg)} vs. ${numDe(rolling.previousAvg)} Tage/Woche).`
    : `Aktueller Schnitt: ${numDe(rolling.currentAvg)} aktive Tage/Woche.`;
  const goalStatus = weeklyGoal
    ? `Ziel: ${weeklyGoal} aktive Tage/Woche. Erreicht in ${attainment.inGoal} von ${attainment.total} abgeschlossenen Wochen (${Math.round(attainment.rate * 100)} %).`
    : 'Kein Trainingsziel gesetzt.';
  const strongestSignal = window
    ? `Bevorzugtes Trainingsfenster: ${window.weekdayLabel} ${window.hourStart.toString().padStart(2, '0')}–${window.hourEnd.toString().padStart(2, '0')} Uhr (${window.count} Check-ins).`
    : 'Kein klares Trainingsfenster erkennbar.';
  const watchout = gap
    ? `Längste Pause im Zeitraum: ${gap.days} Tage (${fmtDateDe(gap.from)} - ${fmtDateDe(gap.to)}).`
    : undefined;

  let tone: 'positive' | 'watch' | 'primary' | 'neutral' = 'primary';
  if (weeklyGoal && attainment.total >= 2) {
    tone = attainment.rate >= 0.75 ? 'positive' : 'watch';
  } else if (rolling.deltaPct != null) {
    tone = rolling.deltaPct >= 0 ? 'positive' : 'watch';
  }

  // ── Chart 1: consistency bar chart ────────────────────────────────
  const consistencyChart: BarChartSpec | undefined = weeks.length
    ? {
        kind: 'bar',
        bars: weeks.map((w) => {
          const label = w.weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
          const color = w.isCurrent
            ? REPORT_COLORS.neutral
            : weeklyGoal && w.activeDays >= weeklyGoal
              ? REPORT_COLORS.positive
              : w.activeDays === 0 ? REPORT_COLORS.hairline : REPORT_COLORS.primary;
          return { label, value: w.activeDays, color };
        }),
        targetLine: weeklyGoal
          ? { y: weeklyGoal, label: `Ziel ${weeklyGoal}/Woche`, color: REPORT_COLORS.accent }
          : undefined,
      }
    : undefined;

  // ── Chart 2: routine map as line-per-weekday (light approximation) ─
  // Simpler: histogram of check-ins per hour of day
  const hourHistogram = new Array(24).fill(0);
  for (const c of periodCheckins) {
    const h = parseInt(c.checkin_time.split(':')[0], 10);
    if (!isNaN(h)) hourHistogram[h] += 1;
  }
  const firstHour = hourHistogram.findIndex(v => v > 0);
  const lastHour = 23 - [...hourHistogram].reverse().findIndex(v => v > 0);
  const hourChart: BarChartSpec | undefined = firstHour >= 0
    ? {
        kind: 'bar',
        bars: hourHistogram
          .slice(Math.max(0, firstHour - 1), Math.min(24, lastHour + 2))
          .map((v, i) => ({
            label: `${(Math.max(0, firstHour - 1) + i).toString().padStart(2, '0')}h`,
            value: v,
            color: REPORT_COLORS.primary,
          })),
      }
    : undefined;

  // Table with recent weeks (last 12)
  const tableRows = completed.slice(-12).map((w) => [
    w.weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    `${w.activeDays}`,
    `${w.visits}`,
    weeklyGoal ? (w.activeDays >= weeklyGoal ? 'im Ziel' : 'unter Ziel') : '–',
  ]);

  return {
    kind: 'training',
    title: 'Trainingsbericht',
    subtitle: 'Konsistenz und Rhythmus deiner Check-ins',
    period: {
      label: formatPeriodLabel(period),
      comparisonLabel: 'Vorperiode',
    },
    generatedAt: new Date(),
    updatedAt,
    dataSources: [{ label: 'Check-ins', count: periodCheckins.length }],
    executiveSummary: {
      tone,
      headline: weeklyGoal && attainment.total >= 2
        ? `${attainment.inGoal} von ${attainment.total} Wochen im Ziel (${Math.round(attainment.rate * 100)} % Zielerreichung).`
        : `Ø ${numDe(rolling.currentAvg)} aktive Trainingstage pro Woche.`,
      change,
      goalStatus,
      strongestSignal,
      watchout,
      kpis,
    },
    sections: [
      {
        id: 'consistency',
        title: 'Konsistenz-Verlauf',
        eyebrow: 'Wochenrhythmus',
        summary: consistencyChart
          ? `Aktive Trainingstage pro ISO-Woche. Graue Balken markieren die laufende, unvollständige Woche. Leere Wochen sind als 0-Balken sichtbar.`
          : 'Nicht genügend Daten für einen Wochen-Chart.',
        chart: consistencyChart,
      },
      {
        id: 'routine',
        title: 'Typisches Trainingsfenster',
        eyebrow: 'Routine',
        summary: hourChart
          ? 'Verteilung deiner Check-ins über die Tageszeit (Zeitraum eingegrenzt auf reale Trainingsstunden).'
          : 'Nicht genügend Zeitdaten für ein Fenster.',
        chart: hourChart,
        bullets: window
          ? [
              { label: 'Bevorzugter Slot', value: `${window.weekdayLabel} ${window.hourStart.toString().padStart(2, '0')}–${window.hourEnd.toString().padStart(2, '0')} Uhr` },
              { label: 'Check-ins im Slot', value: `${window.count}` },
            ]
          : undefined,
      },
      {
        id: 'rhythm',
        title: 'Erholungs-Rhythmus',
        eyebrow: 'Pausenmuster',
        bullets: [
          { label: 'Median Pause zwischen aktiven Tagen', value: median != null ? `${numDe(median, median % 1 ? 1 : 0)} Tage` : '–' },
          { label: 'Längste Pause im Zeitraum', value: gap ? `${gap.days} Tage (${fmtDateDe(gap.from)} - ${fmtDateDe(gap.to)})` : '–' },
          { label: 'Aktive Wochen', value: `${activeWeeks} / ${completed.length}` },
        ],
      },
      ...(tableRows.length
        ? [{
            id: 'facts',
            title: 'Wochen-Übersicht (letzte 12)',
            eyebrow: 'Fakten',
            table: {
              columns: ['Woche', 'Aktive Tage', 'Check-ins', 'Zielstatus'],
              align: ['left', 'right', 'right', 'left'] as Array<'left' | 'right'>,
              rows: tableRows,
            },
          }]
        : []),
    ],
    methodology: [
      'ISO-8601 Wochen, Montag als Start. Aktive Tage = Kalendertage mit mind. einem Check-in.',
      'Rollierender Vergleich: letzte 4 abgeschlossene Wochen gegen die 4 Wochen davor.',
      'Die laufende Woche fließt nicht in Zielquoten oder Vergleiche ein.',
    ],
    dataQuality: [
      periodCheckins.length < 4 ? 'Sehr wenige Check-ins - Aussagen sind noch nicht belastbar.' : '',
    ].filter(Boolean),
    emptyReason: periodCheckins.length === 0
      ? 'Keine Check-ins im gewählten Zeitraum. Wähle einen längeren Zeitraum oder importiere Daten.'
      : undefined,
  };
}
