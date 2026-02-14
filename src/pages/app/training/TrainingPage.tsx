import { useRef, useState } from 'react';
import { Dumbbell, FileDown, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
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

interface PdfSection {
  label: string;
  ref: React.RefObject<HTMLDivElement>;
}

export default function TrainingPage() {
  const { checkins, isLoading, importCsv } = useTrainingCheckins();
  const [exporting, setExporting] = useState(false);

  // Refs for every visual section to capture
  const kpiRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const recordsRef = useRef<HTMLDivElement>(null);
  const gridRow1Ref = useRef<HTMLDivElement>(null);
  const gridRow2Ref = useRef<HTMLDivElement>(null);
  const gridRow3Ref = useRef<HTMLDivElement>(null);

  const pdfSections: PdfSection[] = [
    { label: 'KPI-Übersicht', ref: kpiRef },
    { label: 'Trainingszeiten', ref: heatmapRef },
    { label: 'Persönliche Rekorde', ref: recordsRef },
    { label: 'Frequenz & Ruhetage', ref: gridRow1Ref },
    { label: 'Besuche & Uhrzeiten', ref: gridRow2Ref },
    { label: 'Wochentag & Monat', ref: gridRow3Ref },
  ];

  const handleImport = async (rows: Parameters<typeof importCsv.mutateAsync>[0]) => {
    return importCsv.mutateAsync(rows);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const images: { label: string; dataUrl: string }[] = [];

      for (const section of pdfSections) {
        if (section.ref.current) {
          try {
            const isDark = document.documentElement.classList.contains('dark');
            const dataUrl = await toJpeg(section.ref.current, {
              quality: 0.85,
              pixelRatio: 1.5,
              backgroundColor: isDark ? '#141414' : '#fcfcfc',
              style: { padding: '4px' },
            });
            images.push({ label: section.label, dataUrl });
          } catch (err) {
            console.warn(`Failed to capture ${section.label}:`, err);
          }
        }
      }

      await exportTrainingPDF(checkins, images);
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
          <div ref={kpiRef}><TrainingKPICards checkins={checkins} /></div>
          <div ref={heatmapRef}><TimeBubbleHeatmap checkins={checkins} /></div>
          <div ref={recordsRef}><PersonalRecords checkins={checkins} /></div>
          <div ref={gridRow1Ref} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FrequencyTrendChart checkins={checkins} />
            <RestDaysChart checkins={checkins} />
          </div>
          <div ref={gridRow2Ref} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyVisitsChart checkins={checkins} />
            <TimeDistributionChart checkins={checkins} />
          </div>
          <div ref={gridRow3Ref} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeekdayHeatmap checkins={checkins} />
            <MonthlyComparisonChart checkins={checkins} />
          </div>
          <TrainingCalendar checkins={checkins} />
        </>
      )}
    </div>
  );
}
