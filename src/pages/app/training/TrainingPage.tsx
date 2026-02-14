import { useRef, useState } from 'react';
import { Dumbbell, FileDown, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useTrainingCheckins } from '@/hooks/useTrainingCheckins';
import CsvUploader from '@/components/training/CsvUploader';
import { Button } from '@/components/ui/button';
import { exportTrainingPDF } from '@/lib/training/exportTrainingPDF';
import TrainingKPICards from '@/components/training/TrainingKPICards';
import WeeklyVisitsChart from '@/components/training/WeeklyVisitsChart';
import TimeDistributionChart from '@/components/training/TimeDistributionChart';
import WeekdayHeatmap from '@/components/training/WeekdayHeatmap';
import MonthlyComparisonChart from '@/components/training/MonthlyComparisonChart';
import TrainingCalendar from '@/components/training/TrainingCalendar';
import TimeBubbleHeatmap from '@/components/training/TimeBubbleHeatmap';
import FrequencyTrendChart from '@/components/training/FrequencyTrendChart';
import RestDaysChart from '@/components/training/RestDaysChart';
import PersonalRecords from '@/components/training/PersonalRecords';

interface ChartSection {
  label: string;
  ref: React.RefObject<HTMLDivElement>;
}

export default function TrainingPage() {
  const { checkins, isLoading, importCsv } = useTrainingCheckins();
  const [exporting, setExporting] = useState(false);

  const frequencyRef = useRef<HTMLDivElement>(null);
  const restDaysRef = useRef<HTMLDivElement>(null);
  const weeklyRef = useRef<HTMLDivElement>(null);
  const timeDistRef = useRef<HTMLDivElement>(null);
  const weekdayRef = useRef<HTMLDivElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);

  const chartSections: ChartSection[] = [
    { label: 'Frequenz-Trend', ref: frequencyRef },
    { label: 'Ruhetage-Verteilung', ref: restDaysRef },
    { label: 'Besuche pro Woche', ref: weeklyRef },
    { label: 'Uhrzeiten-Verteilung', ref: timeDistRef },
    { label: 'Wochentags-Verteilung', ref: weekdayRef },
    { label: 'Monatsvergleich', ref: monthlyRef },
  ];

  const handleImport = async (rows: Parameters<typeof importCsv.mutateAsync>[0]) => {
    return importCsv.mutateAsync(rows);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const chartImages: { label: string; dataUrl: string }[] = [];

      for (const section of chartSections) {
        if (section.ref.current) {
          try {
            const dataUrl = await toPng(section.ref.current, {
              backgroundColor: getComputedStyle(document.documentElement)
                .getPropertyValue('--background')
                ? undefined
                : undefined,
              pixelRatio: 2,
            });
            chartImages.push({ label: section.label, dataUrl });
          } catch {
            // skip failed captures
          }
        }
      }

      await exportTrainingPDF(checkins, chartImages.length > 0 ? chartImages : undefined);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Training</h1>
        </div>
        <div className="flex items-center gap-2">
          {checkins.length > 0 && (
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              PDF Export
            </Button>
          )}
          <CsvUploader onImport={handleImport} isLoading={importCsv.isPending} />
        </div>
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
          <TimeBubbleHeatmap checkins={checkins} />
          <PersonalRecords checkins={checkins} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div ref={frequencyRef}><FrequencyTrendChart checkins={checkins} /></div>
            <div ref={restDaysRef}><RestDaysChart checkins={checkins} /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div ref={weeklyRef}><WeeklyVisitsChart checkins={checkins} /></div>
            <div ref={timeDistRef}><TimeDistributionChart checkins={checkins} /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div ref={weekdayRef}><WeekdayHeatmap checkins={checkins} /></div>
            <div ref={monthlyRef}><MonthlyComparisonChart checkins={checkins} /></div>
          </div>
          <TrainingCalendar checkins={checkins} />
        </>
      )}
    </div>
  );
}
