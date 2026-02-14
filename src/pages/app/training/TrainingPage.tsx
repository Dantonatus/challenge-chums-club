import { Dumbbell } from 'lucide-react';
import { useTrainingCheckins } from '@/hooks/useTrainingCheckins';
import CsvUploader from '@/components/training/CsvUploader';
import TrainingKPICards from '@/components/training/TrainingKPICards';
import WeeklyVisitsChart from '@/components/training/WeeklyVisitsChart';
import TimeDistributionChart from '@/components/training/TimeDistributionChart';
import WeekdayHeatmap from '@/components/training/WeekdayHeatmap';
import MonthlyComparisonChart from '@/components/training/MonthlyComparisonChart';
import TrainingCalendar from '@/components/training/TrainingCalendar';

export default function TrainingPage() {
  const { checkins, isLoading, importCsv } = useTrainingCheckins();

  const handleImport = async (rows: Parameters<typeof importCsv.mutateAsync>[0]) => {
    return importCsv.mutateAsync(rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Training</h1>
        </div>
        <CsvUploader onImport={handleImport} isLoading={importCsv.isPending} />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Lade Daten…</div>
      ) : checkins.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Noch keine Check-in-Daten vorhanden.</p>
          <p className="text-sm text-muted-foreground">Importiere eine CSV-Datei, um dein Training zu analysieren.</p>
        </div>
      ) : (
        <>
          <TrainingKPICards checkins={checkins} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyVisitsChart checkins={checkins} />
            <TimeDistributionChart checkins={checkins} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeekdayHeatmap checkins={checkins} />
            <MonthlyComparisonChart checkins={checkins} />
          </div>
          <TrainingCalendar checkins={checkins} />
        </>
      )}
    </div>
  );
}
