import { useMemo, useState } from 'react';
import { FileDown, Target } from 'lucide-react';
import { useTrainingCheckins } from '@/hooks/useTrainingCheckins';
import { useHealthGoal } from '@/hooks/useHealthGoal';
import CsvUploader from '@/components/training/CsvUploader';
import { Button } from '@/components/ui/button';
import PersonalRecords from '@/components/training/PersonalRecords';
import WeekdayHeatmap from '@/components/training/WeekdayHeatmap';
import MonthlyComparisonChart from '@/components/training/MonthlyComparisonChart';
import TrainingCalendar from '@/components/training/TrainingCalendar';
import { PerformanceReportingShell } from '@/components/health/PerformanceReportingShell';
import { GoalEditorSheet } from '@/components/health/GoalEditorSheet';
import { EmptyInsightState } from '@/components/health/EmptyInsightState';
import { ReportPreviewDialog } from '@/components/reporting/ReportPreviewDialog';
import { buildTrainingReportModel } from '@/lib/reporting/buildTrainingReportModel';
import { useReporting } from '@/contexts/ReportingContext';
import { filterByPeriod, parseLocalDate, resolveReferenceDate } from '@/lib/health/periods';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  completedWeeklySeries,
  previousComparableRange,
  trainingGoalAttainment,
  rollingFrequencyChange,
  detectTrainingAnnotations,
  longestGapWithinRange,
  medianRestGap,
} from '@/lib/training/analytics';
import { ConsistencyHero } from '@/components/training/ConsistencyHero';
import { RoutineMap } from '@/components/training/RoutineMap';
import { RecoveryRhythm } from '@/components/training/RecoveryRhythm';
import { TrainingBrief, type TrainingBriefData } from '@/components/training/TrainingBrief';

function pctFmt(x: number | null): string {
  if (x == null || !isFinite(x)) return '–';
  return `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)} %`;
}

function numFmt(n: number, digits = 1): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function TrainingPage() {
  const { checkins, isLoading, importCsv } = useTrainingCheckins();
  const { goal } = useHealthGoal();
  const { period, now } = useReporting();
  const [reportOpen, setReportOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);



  const periodCheckins = useMemo(
    () => filterByPeriod(checkins, period, 'checkin_date'),
    [checkins, period],
  );

  const latestDate = checkins.length
    ? parseLocalDate(checkins[checkins.length - 1].checkin_date)
    : null;

  const referenceDate = useMemo(() => resolveReferenceDate(period, latestDate), [period, latestDate]);

  const weeklyGoal = goal?.weekly_training_target ?? null;

  // Aggregations – deterministisch, ohne Rückgriff auf heutiges Datum außer für "laufende Woche".
  const weeks = useMemo(
    () => completedWeeklySeries(periodCheckins, period, now, weeklyGoal),
    [periodCheckins, period, now, weeklyGoal],
  );
  const attainment = useMemo(() => trainingGoalAttainment(weeks, weeklyGoal), [weeks, weeklyGoal]);
  const annotations = useMemo(() => detectTrainingAnnotations(weeks), [weeks]);

  const rolling = useMemo(() => {
    const completed = weeks.filter(w => !w.isCurrent);
    const current4 = completed.slice(-4);
    const previous4 = completed.slice(-8, -4);
    return rollingFrequencyChange(current4, previous4);
  }, [weeks]);

  // Trend – lineare Regression über aktive Tage der abgeschlossenen Wochen
  const trendPerWeek = useMemo(() => {
    const c = weeks.filter(w => !w.isCurrent);
    if (c.length < 3) return null;
    const n = c.length;
    const xs = c.map((_, i) => i);
    const ys = c.map(w => w.activeDays);
    const meanX = xs.reduce((s, v) => s + v, 0) / n;
    const meanY = ys.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    return den ? num / den : 0;
  }, [weeks]);

  const longestGap = useMemo(() => longestGapWithinRange(periodCheckins, period), [periodCheckins, period]);
  const median = useMemo(() => medianRestGap(periodCheckins), [periodCheckins]);

  const activeWeeks = weeks.filter(w => !w.isCurrent && w.activeDays > 0).length;
  const completedWeeksCount = weeks.filter(w => !w.isCurrent).length;

  const brief: TrainingBriefData = useMemo(() => {
    const chips: TrainingBriefData['chips'] = [];
    const avgFreq = rolling.currentAvg;
    chips.push({ label: 'Ø aktive Tage/Woche', value: numFmt(avgFreq) });
    if (weeklyGoal) {
      chips.push({
        label: 'Zielquote',
        value: `${attainment.inGoal}/${attainment.total} Wochen`,
      });
    }
    if (longestGap) {
      chips.push({ label: 'Längste Lücke', value: `${longestGap.days} Tage` });
    }

    // Headline-Logik
    if (periodCheckins.length === 0) {
      return {
        tone: 'neutral',
        headline: 'Keine Check-ins im gewählten Zeitraum',
        explanation: 'Wähle einen längeren Zeitraum oder importiere weitere Daten, damit hier Aussagen zu deiner Trainingskonsistenz entstehen.',
        chips: [],
      };
    }

    if (weeklyGoal && attainment.total >= 2) {
      const rate = attainment.rate;
      if (rate >= 0.75) {
        return {
          tone: 'positive',
          headline: `Du erreichst dein Wochenziel in ${attainment.inGoal} von ${attainment.total} abgeschlossenen Wochen.`,
          explanation: `Ziel: ${weeklyGoal} aktive Trainingstage pro Woche. Der aktuelle 4-Wochen-Schnitt liegt bei ${numFmt(avgFreq)} aktiven Tagen. Die laufende Woche ist nicht eingerechnet.`,
          chips,
          action: rate < 1
            ? `Halte den Rhythmus – noch ${attainment.total - attainment.inGoal} Woche(n) im Zeitraum unter Ziel.`
            : undefined,
        };
      }
      const deficitPerWeek = Math.max(0, weeklyGoal - avgFreq);
      return {
        tone: 'watch',
        headline: `Du bist in ${attainment.total - attainment.inGoal} von ${attainment.total} Wochen unter deinem Ziel.`,
        explanation: `Ziel: ${weeklyGoal} aktive Tage/Woche. Aktueller 4-Wochen-Schnitt: ${numFmt(avgFreq)} Tage. Die laufende Woche ist nicht in der Zielquote enthalten.`,
        chips,
        action: deficitPerWeek > 0
          ? `Eine zusätzliche Einheit pro Woche schließt die Lücke von rund ${numFmt(deficitPerWeek)} aktiven Tagen.`
          : undefined,
      };
    }

    // Kein Ziel gesetzt – trendbasiert
    if (rolling.deltaPct != null && Math.abs(rolling.deltaPct) >= 0.1) {
      const up = rolling.deltaPct > 0;
      return {
        tone: up ? 'primary' : 'watch',
        headline: `Deine Frequenz liegt in den letzten ${Math.min(4, completedWeeksCount)} abgeschlossenen Wochen ${pctFmt(rolling.deltaPct)} ${up ? 'über' : 'unter'} dem vorherigen Zeitraum.`,
        explanation: `Aktueller Schnitt: ${numFmt(rolling.currentAvg)} aktive Tage/Woche vs. ${numFmt(rolling.previousAvg)} Tage in den vier Wochen davor.`,
        chips,
        action: 'Setze ein Wochenziel, um Zielerreichung dauerhaft messbar zu machen.',
      };
    }

    return {
      tone: 'primary',
      headline: `Du trainierst mit einem Schnitt von ${numFmt(rolling.currentAvg)} aktiven Tagen pro Woche.`,
      explanation: `Aktive Wochen im Zeitraum: ${activeWeeks} von ${completedWeeksCount}. Für Zielaussagen setze ein Wochenziel im Ziel-Editor.`,
      chips,
      action: 'Setze ein Wochenziel, um Zielerreichung dauerhaft messbar zu machen.',
    };
  }, [periodCheckins.length, weeklyGoal, attainment, rolling, longestGap, activeWeeks, completedWeeksCount]);

  const heroHeadline = useMemo(() => ({
    active: `${activeWeeks} von ${completedWeeksCount} Wochen aktiv`,
    goalRate: weeklyGoal
      ? `${Math.round(attainment.rate * 100)} % Zielerreichung`
      : `Median-Pause ${median != null ? `${numFmt(median, median % 1 ? 1 : 0)} Tage` : '–'}`,
    trend: trendPerWeek != null ? `Trend ${trendPerWeek >= 0 ? '+' : ''}${numFmt(trendPerWeek)}/Woche` : 'Trend – zu wenige Wochen',
  }), [activeWeeks, completedWeeksCount, weeklyGoal, attainment.rate, median, trendPerWeek]);

  const handleImport = async (rows: Parameters<typeof importCsv.mutateAsync>[0]) =>
    importCsv.mutateAsync(rows);

  const reportModel = useMemo(
    () => reportOpen
      ? buildTrainingReportModel({
          checkins,
          periodCheckins,
          period,
          now,
          goal,
          updatedAt: latestDate,
        })
      : null,
    [reportOpen, checkins, periodCheckins, period, now, goal, latestDate],
  );

  return (
    <PerformanceReportingShell
      title="Training"
      context="Konsistenz, Rhythmus und typisches Trainingsfenster deiner Check-ins."
      updatedAt={latestDate}
      sources={[{ label: 'Check-ins', count: periodCheckins.length }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Ziel
          </Button>
          {periodCheckins.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Report
            </Button>
          )}
          <CsvUploader onImport={handleImport} isLoading={importCsv.isPending} />
        </>
      }
    >
      {isLoading ? (
        <div className="rounded-2xl border border-health-hairline bg-health-surface p-10 text-center text-health-ink-muted">
          Lade Daten…
        </div>
      ) : periodCheckins.length === 0 ? (
        <div className="space-y-6">
          <TrainingBrief brief={brief} />
          <EmptyInsightState
            title="Keine Trainings im gewählten Zeitraum"
            description="Wähle einen längeren Zeitraum oder importiere eine CSV-Datei mit deinen Check-ins."
          />
        </div>
      ) : (
        <div className="-m-5 space-y-6 p-5">
          <TrainingBrief brief={brief} />

          <ConsistencyHero
            weeks={weeks}
            target={weeklyGoal}
            annotations={annotations}
            headline={heroHeadline}
          />

          <RoutineMap checkins={periodCheckins} />

          <RecoveryRhythm checkins={periodCheckins} range={period} referenceDate={referenceDate} />

          <Accordion type="single" collapsible className="rounded-2xl border border-health-hairline bg-health-surface">
            <AccordionItem value="patterns" className="border-b-0">
              <AccordionTrigger className="px-5 py-4 text-sm font-medium text-health-ink hover:no-underline">
                Muster & Historie
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <WeekdayHeatmap checkins={periodCheckins} />
                  <MonthlyComparisonChart checkins={periodCheckins} />
                </div>
                <div className="mt-4">
                  <PersonalRecords checkins={periodCheckins} />
                </div>
                <div className="mt-4">
                  <TrainingCalendar checkins={periodCheckins} anchorDate={referenceDate} />
                </div>
                <p className="mt-3 text-xs text-health-ink-subtle">
                  Der Kalender öffnet auf dem Ende des gewählten Zeitraums. „Besuche“ zählt jede Check-in-Zeile, „aktive Tage“ zählt Kalendertage mit mindestens einem Check-in.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <GoalEditorSheet open={goalOpen} onOpenChange={setGoalOpen} goal={goal} />
      <ReportPreviewDialog open={reportOpen} onOpenChange={setReportOpen} model={reportModel} />
    </PerformanceReportingShell>
  );
}
