import { useState, useMemo } from 'react';
import { Scale, Heart, Droplets, Flame, Activity, Sun, Moon, Clock, FileDown, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportPreviewDialog } from '@/components/reporting/ReportPreviewDialog';
import { buildWeightReportModel } from '@/lib/reporting/buildWeightReportModel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWeightEntries } from '@/hooks/useWeightEntries';
import { useForecastSnapshots } from '@/hooks/useForecastSnapshots';
import { useSmartScaleEntries } from '@/hooks/useSmartScaleEntries';
import { useHealthGoal } from '@/hooks/useHealthGoal';
import { mergeWeightSources } from '@/lib/weight/unifiedTimeline';
import { filterByTimeOfDay, type TimeSlot } from '@/lib/smartscale/analytics';
import WeightInput from '@/components/weight/WeightInput';
import WeightTerrainChart from '@/components/weight/WeightTerrainChart';
import WeightKPICards from '@/components/weight/WeightKPICards';
import WeightHeatmapStrip from '@/components/weight/WeightHeatmapStrip';
import WeightEntryList from '@/components/weight/WeightEntryList';
import ScaleFileUploader from '@/components/smartscale/ScaleFileUploader';
import ScaleKPIStrip from '@/components/smartscale/ScaleKPIStrip';
import BodyCompositionChart from '@/components/smartscale/BodyCompositionChart';
import HeartHealthChart from '@/components/smartscale/HeartHealthChart';
import VisceralFatChart from '@/components/smartscale/VisceralFatChart';
import MetabolismChart from '@/components/smartscale/MetabolismChart';
import DailyComparisonCard from '@/components/smartscale/DailyComparisonCard';
import { PerformanceReportingShell } from '@/components/health/PerformanceReportingShell';
import { GoalEditorSheet } from '@/components/health/GoalEditorSheet';
import { EmptyInsightState } from '@/components/health/EmptyInsightState';
import { useReporting } from '@/contexts/ReportingContext';
import { filterByPeriod, parseLocalDate } from '@/lib/health/periods';


export default function WeightPage() {
  const { entries, isLoading, upsert, update, remove } = useWeightEntries();
  const { snapshots } = useForecastSnapshots();
  const { entries: scaleEntries, isLoading: scaleLoading, bulkImport } = useSmartScaleEntries();
  const { goal } = useHealthGoal();
  const { period } = useReporting();
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');
  const [reportOpen, setReportOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);


  const filteredScaleEntries = useMemo(
    () => filterByTimeOfDay(scaleEntries, timeSlot),
    [scaleEntries, timeSlot],
  );

  const hasScaleData = scaleEntries.length > 0;
  const hasHRData = scaleEntries.some((e) => e.heart_rate_bpm !== null);

  const unifiedEntries = useMemo(() => {
    const merged = mergeWeightSources(entries, scaleEntries);
    if (timeSlot === 'all') return merged;
    return merged.filter((e) => {
      const hour = parseInt((e.time ?? '').slice(0, 2), 10);
      if (isNaN(hour)) return timeSlot === 'morning';
      if (timeSlot === 'morning') return hour < 15;
      return hour >= 15;
    });
  }, [entries, scaleEntries, timeSlot]);

  const periodEntries = useMemo(
    () => filterByPeriod(unifiedEntries, period, 'date'),
    [unifiedEntries, period],
  );

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const latestDate = entries.length ? parseLocalDate(entries[entries.length - 1].date) : null;


  const reportModel = useMemo(
    () => reportOpen
      ? buildWeightReportModel({
          entries: periodEntries,
          allEntries: unifiedEntries,
          hasScaleContext: hasScaleData,
          goal,
          period,
          updatedAt: latestDate,
        })
      : null,
    [reportOpen, periodEntries, unifiedEntries, hasScaleData, goal, period, latestDate],
  );

  const handleSave = async (data: { date: string; time: string; weight_kg: number }) => {
    await upsert.mutateAsync(data);
  };


  return (
    <PerformanceReportingShell
      title="Gewicht"
      context="Manuelle Einträge, Smart-Scale-Daten und dein Verlauf im gewählten Zeitraum."
      updatedAt={latestDate}
      sources={[
        { label: 'Manuell', count: entries.length },
        { label: 'Smart Scale', count: scaleEntries.length },
      ]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Ziel
          </Button>
          {unifiedEntries.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Report
            </Button>
          )}
          <ScaleFileUploader onImport={(parsed) => bulkImport.mutateAsync(parsed)} isLoading={bulkImport.isPending} />
        </>
      }
    >
      {isLoading || scaleLoading ? (
        <div className="rounded-2xl border border-health-hairline bg-health-surface p-10 text-center text-health-ink-muted">Lade Daten…</div>
      ) : (
        <div className="space-y-6">
          <WeightInput lastEntry={lastEntry} onSave={handleSave} isSaving={upsert.isPending} />

          <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="justify-start overflow-x-auto">
                <TabsTrigger value="overview" className="gap-1.5 text-xs">
                  <Activity className="h-3.5 w-3.5" />
                  Übersicht
                </TabsTrigger>
                {hasScaleData && (
                  <TabsTrigger value="body" className="gap-1.5 text-xs">
                    <Scale className="h-3.5 w-3.5" />
                    Körper
                  </TabsTrigger>
                )}
                {hasHRData && (
                  <TabsTrigger value="heart" className="gap-1.5 text-xs">
                    <Heart className="h-3.5 w-3.5" />
                    Herz
                  </TabsTrigger>
                )}
                {hasScaleData && (
                  <TabsTrigger value="fat" className="gap-1.5 text-xs">
                    <Droplets className="h-3.5 w-3.5" />
                    Fett
                  </TabsTrigger>
                )}
                {hasScaleData && (
                  <TabsTrigger value="metabolism" className="gap-1.5 text-xs">
                    <Flame className="h-3.5 w-3.5" />
                    Stoffwechsel
                  </TabsTrigger>
                )}
              </TabsList>

              <ToggleGroup
                type="single"
                value={timeSlot}
                onValueChange={(v) => { if (v) setTimeSlot(v as TimeSlot); }}
                size="sm"
                className="bg-muted rounded-lg p-0.5"
              >
                <ToggleGroupItem value="morning" className="gap-1 text-xs px-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                  <Sun className="h-3 w-3" /> Morgens
                </ToggleGroupItem>
                <ToggleGroupItem value="evening" className="gap-1 text-xs px-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                  <Moon className="h-3 w-3" /> Abends
                </ToggleGroupItem>
                <ToggleGroupItem value="all" className="gap-1 text-xs px-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                  <Clock className="h-3 w-3" /> Alle
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <TabsContent value="overview" className="space-y-4">
              {periodEntries.length > 0 ? (
                <>
                  <WeightKPICards entries={periodEntries} />
                  <WeightEntryList
                    entries={periodEntries}
                    onUpdate={(id, weight_kg) => update.mutate({ id, weight_kg })}
                    onDelete={(id) => remove.mutate({ id })}
                  />
                  {hasScaleData && <DailyComparisonCard entries={filteredScaleEntries} />}
                  <WeightTerrainChart entries={periodEntries} selectedMonth={null} snapshots={snapshots} />
                  <WeightHeatmapStrip entries={periodEntries} />
                </>
              ) : (
                <EmptyInsightState title="Keine Messungen im Zeitraum" description="Wähle einen längeren Zeitraum oder trage einen neuen Wert ein." />
              )}
            </TabsContent>

            {hasScaleData && (
              <TabsContent value="body" className="space-y-4">
                <ScaleKPIStrip entries={filteredScaleEntries} />
                <BodyCompositionChart entries={filteredScaleEntries} />
              </TabsContent>
            )}
            {hasHRData && (
              <TabsContent value="heart" className="space-y-4">
                <HeartHealthChart entries={filteredScaleEntries} />
              </TabsContent>
            )}
            {hasScaleData && (
              <TabsContent value="fat" className="space-y-4">
                <VisceralFatChart entries={filteredScaleEntries} />
              </TabsContent>
            )}
            {hasScaleData && (
              <TabsContent value="metabolism" className="space-y-4">
                <MetabolismChart entries={filteredScaleEntries} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      <GoalEditorSheet open={goalOpen} onOpenChange={setGoalOpen} goal={goal} />
      <ReportPreviewDialog open={reportOpen} onOpenChange={setReportOpen} model={reportModel} />
    </PerformanceReportingShell>
  );
}
