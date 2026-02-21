import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, ScanLine, Scale } from 'lucide-react';
import { useWeightEntries } from '@/hooks/useWeightEntries';
import { useForecastSnapshots } from '@/hooks/useForecastSnapshots';
import { useSmartScaleEntries } from '@/hooks/useSmartScaleEntries';
import WeightInput from '@/components/weight/WeightInput';
import WeightTerrainChart from '@/components/weight/WeightTerrainChart';
import WeightKPICards from '@/components/weight/WeightKPICards';
import WeightHeatmapStrip from '@/components/weight/WeightHeatmapStrip';
import MonthSummaryBar from '@/components/weight/MonthSummaryBar';
import WeightEntryList from '@/components/weight/WeightEntryList';
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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname;
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  const handleSave = async (data: { date: string; time: string; weight_kg: number }) => {
    await upsert.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
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
            <button
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-background text-foreground shadow-sm"
            >
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

          {/* Smart Scale Dashboard */}
          {scaleEntries.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Smart Scale</h2>
              <ScaleKPIStrip entries={scaleEntries} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BodyCompositionChart entries={scaleEntries} />
                <HeartHealthChart entries={scaleEntries} />
                <VisceralFatChart entries={scaleEntries} />
                <MetabolismChart entries={scaleEntries} />
              </div>
              <DailyComparisonCard entries={scaleEntries} />
            </div>
          )}

          {entries.length > 0 && (
            <>
              <WeightKPICards entries={entries} />
              <WeightEntryList
                entries={entries}
                onUpdate={(id, weight_kg) => update.mutate({ id, weight_kg })}
                onDelete={(id) => remove.mutate({ id })}
              />
              <MonthSummaryBar entries={entries} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
              <WeightTerrainChart entries={entries} selectedMonth={selectedMonth} snapshots={snapshots} />
              <WeightHeatmapStrip entries={entries} />
            </>
          )}
        </>
      )}
    </div>
  );
}
