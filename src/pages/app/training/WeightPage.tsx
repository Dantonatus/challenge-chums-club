import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, ScanLine, Scale } from 'lucide-react';
import { useWeightEntries } from '@/hooks/useWeightEntries';
import WeightInput from '@/components/weight/WeightInput';
import WeightTerrainChart from '@/components/weight/WeightTerrainChart';
import WeightKPICards from '@/components/weight/WeightKPICards';
import WeightHeatmapStrip from '@/components/weight/WeightHeatmapStrip';
import MonthSummaryBar from '@/components/weight/MonthSummaryBar';

export default function WeightPage() {
  const { entries, isLoading, upsert } = useWeightEntries();
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
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Lade Daten…</div>
      ) : (
        <>
          <WeightInput lastEntry={lastEntry} onSave={handleSave} isSaving={upsert.isPending} />
          {entries.length > 0 && (
            <>
              <WeightKPICards entries={entries} />
              <MonthSummaryBar entries={entries} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
              <WeightTerrainChart entries={entries} selectedMonth={selectedMonth} />
              <WeightHeatmapStrip entries={entries} />
            </>
          )}
        </>
      )}
    </div>
  );
}
