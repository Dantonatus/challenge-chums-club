import { useMemo, useState } from 'react';
import { FileDown, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PerformanceReportingShell } from '@/components/health/PerformanceReportingShell';
import { ExecutiveBrief } from '@/components/health/ExecutiveBrief';
import { JourneyHero } from '@/components/health/JourneyHero';
import { MetricHero } from '@/components/health/MetricHero';
import { ChartFrame } from '@/components/health/ChartFrame';
import { GoalEditorSheet } from '@/components/health/GoalEditorSheet';
import { EmptyInsightState } from '@/components/health/EmptyInsightState';
import { useReporting } from '@/contexts/ReportingContext';
import { useTrainingCheckins } from '@/hooks/useTrainingCheckins';
import { useBodyScans } from '@/hooks/useBodyScans';
import { useWeightEntries } from '@/hooks/useWeightEntries';
import { useSmartScaleEntries } from '@/hooks/useSmartScaleEntries';
import { useHealthGoal } from '@/hooks/useHealthGoal';
import { computeInsights } from '@/lib/health/executiveInsights';
import { filterByPeriod, parseLocalDate } from '@/lib/health/periods';

export default function TrainingOverviewPage() {
  const { period, comparison } = useReporting();
  const { checkins, isLoading: cL } = useTrainingCheckins();
  const { scans, isLoading: sL } = useBodyScans();
  const { entries: weights, isLoading: wL } = useWeightEntries();
  const { entries: smartScale, isLoading: ssL } = useSmartScaleEntries();
  const { goal } = useHealthGoal();
  const [goalOpen, setGoalOpen] = useState(false);

  const isLoading = cL || sL || wL || ssL;

  const insights = useMemo(
    () => computeInsights({ checkins, scans, weights, smartScale, goal, period, comparison }),
    [checkins, scans, weights, smartScale, goal, period, comparison],
  );

  const latestDate = useMemo(() => {
    const dates: number[] = [];
    if (checkins.length) dates.push(parseLocalDate(checkins[checkins.length - 1].checkin_date).getTime());
    if (scans.length) dates.push(parseLocalDate(scans[scans.length - 1].scan_date).getTime());
    if (weights.length) dates.push(parseLocalDate(weights[weights.length - 1].date).getTime());
    if (smartScale.length) dates.push(parseLocalDate(smartScale[smartScale.length - 1].measured_at).getTime());
    return dates.length ? new Date(Math.max(...dates)) : null;
  }, [checkins, scans, weights, smartScale]);

  const periodCheckins = filterByPeriod(checkins, period, 'checkin_date');
  const periodScans = filterByPeriod(scans, period, 'scan_date');
  const periodWeights = filterByPeriod(weights, period, 'date');

  const latestScan = periodScans[periodScans.length - 1] ?? scans[scans.length - 1] ?? null;
  const latestWeight = (() => {
    const w = periodWeights[periodWeights.length - 1] ?? weights[weights.length - 1];
    return w ? Number(w.weight_kg) : null;
  })();

  // Trainings pro Woche im Zeitraum
  const trainingsPerWeek = (() => {
    if (!periodCheckins.length) return 0;
    const days = Math.max(1, (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    return periodCheckins.length / (days / 7);
  })();

  // Deltas fürs Hero
  const firstScan = periodScans[0];
  const scanWeightDelta = firstScan && latestScan ? Number(latestScan.weight_kg ?? 0) - Number(firstScan.weight_kg ?? 0) : 0;
  const scanMuscleDelta = firstScan && latestScan ? Number(latestScan.muscle_mass_kg ?? 0) - Number(firstScan.muscle_mass_kg ?? 0) : 0;
  const scanFatDelta = firstScan && latestScan ? Number(latestScan.fat_mass_kg ?? 0) - Number(firstScan.fat_mass_kg ?? 0) : 0;

  const totalRecords = checkins.length + scans.length + weights.length + smartScale.length;

  return (
    <PerformanceReportingShell
      title="Deine Performance"
      context="Alles Wichtige aus Training, Körper und Gewicht auf einen Blick – im gewählten Zeitraum."
      updatedAt={latestDate}
      sources={[
        { label: 'Trainings', count: checkins.length },
        { label: 'Scans', count: scans.length },
        { label: 'Messungen', count: weights.length + smartScale.length },
      ]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Ziel
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            Report exportieren
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="rounded-2xl border border-health-hairline bg-health-surface p-10 text-center text-health-ink-muted">
          Lade Reporting-Daten …
        </div>
      ) : totalRecords === 0 ? (
        <EmptyInsightState
          title="Noch keine Daten"
          description="Importiere Trainings-Check-ins, TANITA-Scans oder Gewichtsdaten, um dein Reporting zu starten."
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <ExecutiveBrief insights={insights} />
            </div>
            <div className="lg:col-span-4">
              <JourneyHero
                goal={goal}
                currentWeight={latestWeight}
                currentBodyFat={latestScan?.fat_percent ? Number(latestScan.fat_percent) : null}
                weeklyTrainingCount={Math.round(trainingsPerWeek)}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ChartFrame title="Trainings" caption="im Zeitraum" eyebrow="Rhythmus">
              <MetricHero
                label=""
                value={periodCheckins.length.toString()}
                unit="Einheiten"
                delta={{
                  value: trainingsPerWeek,
                  suffix: ' / Woche',
                  digits: 1,
                  positiveWhen: 'up',
                }}
              />
            </ChartFrame>
            <ChartFrame title="Gewicht" caption="letzter Messpunkt" eyebrow="Aktuell">
              {latestWeight != null ? (
                <MetricHero
                  label=""
                  value={latestWeight.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  unit="kg"
                  tone="observed"
                />
              ) : (
                <EmptyInsightState title="Keine Waage-Daten" description="Trage ein Gewicht ein oder importiere Smart-Scale-Daten." />
              )}
            </ChartFrame>
            <ChartFrame title="Muskelmasse" caption="Δ im Zeitraum" eyebrow="Körper">
              {firstScan && latestScan ? (
                <MetricHero
                  label=""
                  value={(latestScan.muscle_mass_kg ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  unit="kg"
                  tone="muscle"
                  delta={{ value: scanMuscleDelta, suffix: ' kg', positiveWhen: 'up' }}
                />
              ) : (
                <EmptyInsightState title="Zu wenige Scans" description="Mindestens zwei TANITA-Scans für einen Trend." />
              )}
            </ChartFrame>
            <ChartFrame title="Fettmasse" caption="Δ im Zeitraum" eyebrow="Körper">
              {firstScan && latestScan ? (
                <MetricHero
                  label=""
                  value={(latestScan.fat_mass_kg ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  unit="kg"
                  tone="fat"
                  delta={{ value: scanFatDelta, suffix: ' kg', positiveWhen: 'down' }}
                />
              ) : (
                <EmptyInsightState title="Zu wenige Scans" description="Mindestens zwei TANITA-Scans für einen Trend." />
              )}
            </ChartFrame>
          </div>

          {scanWeightDelta !== 0 && (
            <div className="rounded-2xl border border-health-hairline bg-health-surface p-6 text-sm text-health-ink-muted shadow-health-soft">
              <span className="font-medium text-health-ink">Gewicht seit erstem Scan im Zeitraum:</span>{' '}
              {scanWeightDelta > 0 ? '+' : ''}
              {scanWeightDelta.toFixed(1)} kg – die Bewertung dieser Zahl hängt von Muskel-/Fett-Anteil ab (siehe Executive Brief).
            </div>
          )}
        </>
      )}

      <GoalEditorSheet open={goalOpen} onOpenChange={setGoalOpen} goal={goal} />
    </PerformanceReportingShell>
  );
}
