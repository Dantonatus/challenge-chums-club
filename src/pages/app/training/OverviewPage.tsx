import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
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

  // Alle Ableitungen strikt aus dem Zeitraum – kein globaler Fallback,
  // sonst wirken KPI-Karten „eingefroren", wenn der neue Zeitraum leer ist.
  const periodCheckins = useMemo(() => filterByPeriod(checkins, period, 'checkin_date'), [checkins, period]);
  const periodScans = useMemo(() => filterByPeriod(scans, period, 'scan_date'), [scans, period]);
  const periodWeights = useMemo(() => filterByPeriod(weights, period, 'date'), [weights, period]);
  const periodSmart = useMemo(() => filterByPeriod(smartScale, period, 'measured_at'), [smartScale, period]);

  // Firsts / Lasts strikt im Zeitraum
  const firstScan = periodScans[0] ?? null;
  const latestScan = periodScans[periodScans.length - 1] ?? null;

  // Für die Ziel-Journey (rechte Karte) darf – anders als KPIs – ein globaler
  // Fallback verwendet werden, damit „aktueller Stand vs. Ziel" nicht verschwindet.
  const globalLatestWeight = weights.length ? Number(weights[weights.length - 1].weight_kg) : null;
  const globalLatestScan = scans.length ? scans[scans.length - 1] : null;

  // Period-strenger letzter Gewichtspunkt (Manual + Smart Scale kombiniert)
  const periodLatestWeight = useMemo(() => {
    const candidates: { t: number; w: number }[] = [];
    for (const w of periodWeights) {
      candidates.push({ t: parseLocalDate(w.date).getTime(), w: Number(w.weight_kg) });
    }
    for (const s of periodSmart) {
      const anyS = s as any;
      const kg = Number(anyS.weight_kg ?? anyS.weight ?? NaN);
      if (isFinite(kg)) candidates.push({ t: new Date(anyS.measured_at).getTime(), w: kg });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.t - b.t);
    return candidates[candidates.length - 1].w;
  }, [periodWeights, periodSmart]);

  // Trainings pro Woche im Zeitraum
  const trainingsPerWeek = useMemo(() => {
    if (!periodCheckins.length) return 0;
    const days = Math.max(1, (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    return periodCheckins.length / (days / 7);
  }, [periodCheckins, period]);

  // Deltas im Zeitraum (nur wenn ≥ 2 Scans, sonst null)
  const hasScanTrend = periodScans.length >= 2 && firstScan && latestScan;
  const scanWeightDelta = hasScanTrend
    ? Number(latestScan!.weight_kg ?? 0) - Number(firstScan!.weight_kg ?? 0)
    : 0;
  const scanMuscleDelta = hasScanTrend
    ? Number(latestScan!.muscle_mass_kg ?? 0) - Number(firstScan!.muscle_mass_kg ?? 0)
    : 0;
  const scanFatDelta = hasScanTrend
    ? Number(latestScan!.fat_mass_kg ?? 0) - Number(firstScan!.fat_mass_kg ?? 0)
    : 0;

  const totalRecords = checkins.length + scans.length + weights.length + smartScale.length;

  return (
    <PerformanceReportingShell
      title="Deine Performance"
      context="Alles Wichtige aus Training, Körper und Gewicht auf einen Blick – im gewählten Zeitraum."
      updatedAt={latestDate}
      sources={[
        { label: 'Trainings', count: periodCheckins.length },
        { label: 'Scans', count: periodScans.length },
        { label: 'Messungen', count: periodWeights.length + periodSmart.length },
      ]}
      actions={
        <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
          <Target className="mr-1.5 h-3.5 w-3.5" />
          Ziel
        </Button>
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
                currentWeight={periodLatestWeight ?? globalLatestWeight}
                currentBodyFat={
                  latestScan?.fat_percent != null
                    ? Number(latestScan.fat_percent)
                    : globalLatestScan?.fat_percent != null
                      ? Number(globalLatestScan.fat_percent)
                      : null
                }
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
            <ChartFrame title="Gewicht" caption="letzter Punkt im Zeitraum" eyebrow="Aktuell">
              {periodLatestWeight != null ? (
                <MetricHero
                  label=""
                  value={periodLatestWeight.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  unit="kg"
                  tone="observed"
                />
              ) : (
                <EmptyInsightState title="Keine Waage-Daten" description="Kein Gewichtseintrag im gewählten Zeitraum." />
              )}
            </ChartFrame>
            <ChartFrame title="Muskelmasse" caption="aktuell · Δ im Zeitraum" eyebrow="Körper">
              {hasScanTrend ? (
                <MetricHero
                  label=""
                  value={Number(latestScan!.muscle_mass_kg ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  unit="kg"
                  tone="muscle"
                  delta={{
                    value: scanMuscleDelta,
                    suffix: ' kg',
                    digits: 1,
                    positiveWhen: 'up',
                  }}
                />
              ) : (
                <EmptyInsightState title="Zu wenige Scans" description="Mindestens zwei TANITA-Scans im Zeitraum für einen Trend." />
              )}
            </ChartFrame>
            <ChartFrame title="Fettmasse" caption="aktuell · Δ im Zeitraum" eyebrow="Körper">
              {hasScanTrend ? (
                <MetricHero
                  label=""
                  value={Number(latestScan!.fat_mass_kg ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  unit="kg"
                  tone="fat"
                  delta={{
                    value: scanFatDelta,
                    suffix: ' kg',
                    digits: 1,
                    positiveWhen: 'down',
                  }}
                />
              ) : (
                <EmptyInsightState title="Zu wenige Scans" description="Mindestens zwei TANITA-Scans im Zeitraum für einen Trend." />
              )}
            </ChartFrame>
          </div>

          {hasScanTrend && scanWeightDelta !== 0 && (
            <div className="rounded-2xl border border-health-hairline bg-health-surface p-6 text-sm text-health-ink-muted shadow-health-soft">
              <span className="font-medium text-health-ink">Gewicht zwischen erstem und letztem Scan im Zeitraum:</span>{' '}
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
