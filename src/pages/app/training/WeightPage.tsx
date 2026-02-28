import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ScanLine, Scale, Heart, Droplets, Flame, Activity, Sun, Moon, Clock, FileDown, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { exportWeightPDF } from '@/lib/weight/exportWeightPDF';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWeightEntries } from '@/hooks/useWeightEntries';
import { useForecastSnapshots } from '@/hooks/useForecastSnapshots';
import { useSmartScaleEntries } from '@/hooks/useSmartScaleEntries';
import { mergeWeightSources } from '@/lib/weight/unifiedTimeline';
import { filterByDateRange } from '@/lib/weight/analytics';
import { filterByTimeOfDay, type TimeSlot } from '@/lib/smartscale/analytics';
import WeightInput from '@/components/weight/WeightInput';
import WeightTerrainChart from '@/components/weight/WeightTerrainChart';
import WeightKPICards from '@/components/weight/WeightKPICards';
import WeightHeatmapStrip from '@/components/weight/WeightHeatmapStrip';
import MonthSummaryBar from '@/components/weight/MonthSummaryBar';
import WeightEntryList from '@/components/weight/WeightEntryList';
import PeriodNavigator from '@/components/weight/PeriodNavigator';
import ScaleFileUploader from '@/components/smartscale/ScaleFileUploader';
import ScaleKPIStrip from '@/components/smartscale/ScaleKPIStrip';
import BodyCompositionChart from '@/components/smartscale/BodyCompositionChart';
import HeartHealthChart from '@/components/smartscale/HeartHealthChart';
import VisceralFatChart from '@/components/smartscale/VisceralFatChart';
import MetabolismChart from '@/components/smartscale/MetabolismChart';
import DailyComparisonCard from '@/components/smartscale/DailyComparisonCard';

export default function WeightPage() {
  const { entries, isLoading, upsert, update, remove } = useWeightEntries();
  const { snapshots } = useForecastSnapshots();
  const { entries: scaleEntries, isLoading: scaleLoading, bulkImport } = useSmartScaleEntries();
  const [periodRange, setPeriodRange] = useState<{ start: Date; end: Date } | null>(null);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');
  const navigate = useNavigate();

  const filteredScaleEntries = useMemo(
    () => filterByTimeOfDay(scaleEntries, timeSlot),
    [scaleEntries, timeSlot],
  );

  const hasScaleData = scaleEntries.length > 0;
  const hasHRData = scaleEntries.some(e => e.heart_rate_bpm !== null);

  // Unified weight timeline: manual + scale (respects time-of-day filter)
  const unifiedEntries = useMemo(() => {
    const merged = mergeWeightSources(entries, scaleEntries);
    if (timeSlot === 'all') return merged;
    return merged.filter(e => {
      const hour = parseInt((e.time ?? '').slice(0, 2), 10);
      if (isNaN(hour)) return timeSlot === 'morning';
      if (timeSlot === 'morning') return hour < 15;
      return hour >= 15;
    });
  }, [entries, scaleEntries, timeSlot]);
  const handlePeriodChange = useCallback((start: Date, end: Date) => {
    setPeriodRange({ start, end });
  }, []);

  // Filter unified entries by selected period
  const periodEntries = useMemo(() => {
    if (!periodRange) return unifiedEntries;
    return filterByDateRange(unifiedEntries, periodRange.start, periodRange.end);
  }, [unifiedEntries, periodRange]);

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  const handleSave = async (data: { date: string; time: string; weight_kg: number }) => {
    await upsert.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Training</h1>
          <div className="flex items-center gap-1 ml-2 bg-muted rounded-lg p-1">
            <button
              onClick={() => navigate('/app/training')}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground"
            >
              <Dumbbell className="h-3.5 w-3.5 inline mr-1" />
              Check-ins
            </button>
            <button
              onClick={() => navigate('/app/training/bodyscan')}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground"
            >
              <ScanLine className="h-3.5 w-3.5 inline mr-1" />
              Body Scan
            </button>
            <button className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-background text-foreground shadow-sm">
              <Scale className="h-3.5 w-3.5 inline mr-1" />
              Gewicht
            </button>
          </div>
        </div>
        <ScaleFileUploader
          onImport={(parsed) => bulkImport.mutateAsync(parsed)}
          isLoading={bulkImport.isPending}
        />
      </div>

      {isLoading || scaleLoading ? (
        <div className="text-muted-foreground text-center py-12">Lade Daten…</div>
      ) : (
        <>
          <WeightInput lastEntry={lastEntry} onSave={handleSave} isSaving={upsert.isPending} />

          <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
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

              {hasScaleData && (
                <ToggleGroup
                  type="single"
                  value={timeSlot}
                  onValueChange={(v) => { if (v) setTimeSlot(v as TimeSlot); }}
                  size="sm"
                  className="bg-muted rounded-lg p-0.5"
                >
                  <ToggleGroupItem value="morning" className="gap-1 text-xs px-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                    <Sun className="h-3 w-3" />
                    Morgens
                  </ToggleGroupItem>
                  <ToggleGroupItem value="evening" className="gap-1 text-xs px-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                    <Moon className="h-3 w-3" />
                    Abends
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all" className="gap-1 text-xs px-2.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                    <Clock className="h-3 w-3" />
                    Alle
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>

            {/* Tab: Übersicht */}
            <TabsContent value="overview" className="space-y-4">
              {unifiedEntries.length > 0 && (
                <>
                  <PeriodNavigator onChange={handlePeriodChange} modes={['week', 'month', 'quarter', 'year', 'all']} />
                  <WeightKPICards entries={periodEntries} />
                  <WeightEntryList
                    entries={periodEntries}
                    onUpdate={(id, weight_kg) => update.mutate({ id, weight_kg })}
                    onDelete={(id) => remove.mutate({ id })}
                  />
                  {hasScaleData && <DailyComparisonCard entries={scaleEntries} />}
                  <WeightTerrainChart entries={periodEntries} selectedMonth={null} snapshots={snapshots} />
                  <WeightHeatmapStrip entries={periodEntries} />
                </>
              )}
            </TabsContent>

            {/* Tab: Körper */}
            {hasScaleData && (
              <TabsContent value="body" className="space-y-4">
                <ScaleKPIStrip entries={filteredScaleEntries} />
                <BodyCompositionChart entries={filteredScaleEntries} />
              </TabsContent>
            )}

            {/* Tab: Herz */}
            {hasHRData && (
              <TabsContent value="heart" className="space-y-4">
                <HeartHealthChart entries={filteredScaleEntries} />
              </TabsContent>
            )}

            {/* Tab: Fett */}
            {hasScaleData && (
              <TabsContent value="fat" className="space-y-4">
                <VisceralFatChart entries={filteredScaleEntries} />
              </TabsContent>
            )}

            {/* Tab: Stoffwechsel */}
            {hasScaleData && (
              <TabsContent value="metabolism" className="space-y-4">
                <MetabolismChart entries={filteredScaleEntries} />
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}