import { useRef, useState, useMemo } from 'react';
import { FileDown, Loader2, Target } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { useTrainingCheckins } from '@/hooks/useTrainingCheckins';
import { useHealthGoal } from '@/hooks/useHealthGoal';
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
import { PerformanceReportingShell } from '@/components/health/PerformanceReportingShell';
import { GoalEditorSheet } from '@/components/health/GoalEditorSheet';
import { useReporting } from '@/contexts/ReportingContext';
import { filterByPeriod, parseLocalDate } from '@/lib/health/periods';
import { EmptyInsightState } from '@/components/health/EmptyInsightState';


interface PdfSection {
  label: string;
  ref: React.RefObject<HTMLDivElement>;
}

export default function TrainingPage() {
  const { checkins, isLoading, importCsv } = useTrainingCheckins();
  const { goal } = useHealthGoal();
  const { period } = useReporting();
  const [exporting, setExporting] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const kpiRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const recordsRef = useRef<HTMLDivElement>(null);
  const gridRow1Ref = useRef<HTMLDivElement>(null);
  const gridRow2Ref = useRef<HTMLDivElement>(null);
  const gridRow3Ref = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const pdfSections: PdfSection[] = [
    { label: 'KPI-Übersicht', ref: kpiRef },
    { label: 'Trainingszeiten', ref: heatmapRef },
    { label: 'Persönliche Rekorde', ref: recordsRef },
    { label: 'Frequenz & Ruhetage', ref: gridRow1Ref },
    { label: 'Besuche & Uhrzeiten', ref: gridRow2Ref },
    { label: 'Wochentag & Monat', ref: gridRow3Ref },
    { label: 'Trainingskalender', ref: calendarRef },
  ];

  const periodCheckins = useMemo(() => filterByPeriod(checkins, period, 'checkin_date'), [checkins, period]);
  const latestDate = checkins.length ? parseLocalDate(checkins[checkins.length - 1].checkin_date) : null;

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
              pixelRatio: 2,
              quality: 0.92,
              backgroundColor: isDark ? '#141414' : '#fcfcfc',
            });
            images.push({ label: section.label, dataUrl });
          } catch (err) {
            console.warn(`Failed to capture ${section.label}:`, err);
          }
        }
      }
      await exportTrainingPDF(periodCheckins, images);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PerformanceReportingShell
      title="Training"
      context="Rhythmus, Frequenz und Zeitverteilung deiner Check-ins."
      updatedAt={latestDate}
      sources={[{ label: 'Check-ins', count: periodCheckins.length }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Ziel
          </Button>
          {checkins.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileDown className="mr-1.5 h-3.5 w-3.5" />}
              PDF
            </Button>
          )}
          <CsvUploader onImport={handleImport} isLoading={importCsv.isPending} />
        </>
      }
    >
      {isLoading ? (
        <div className="rounded-2xl border border-health-hairline bg-health-surface p-10 text-center text-health-ink-muted">Lade Daten…</div>
      ) : periodCheckins.length === 0 ? (
        <EmptyInsightState
          title="Keine Trainings im gewählten Zeitraum"
          description="Wähle einen längeren Zeitraum oder importiere eine CSV-Datei mit deinen Check-ins."
        />
      ) : (
        <div className="space-y-6">
          <div ref={kpiRef} className="-m-5 p-5"><TrainingKPICards checkins={periodCheckins} /></div>
          <div ref={heatmapRef} className="-m-5 p-5"><TimeBubbleHeatmap checkins={periodCheckins} /></div>
          <div ref={recordsRef} className="-m-5 p-5"><PersonalRecords checkins={periodCheckins} /></div>
          <div ref={gridRow1Ref} className="-m-5 p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FrequencyTrendChart checkins={periodCheckins} />
            <RestDaysChart checkins={periodCheckins} />
          </div>
          <div ref={gridRow2Ref} className="-m-5 p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyVisitsChart checkins={periodCheckins} />
            <TimeDistributionChart checkins={periodCheckins} />
          </div>
          <div ref={gridRow3Ref} className="-m-5 p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeekdayHeatmap checkins={periodCheckins} />
            <MonthlyComparisonChart checkins={periodCheckins} />
          </div>
          <div ref={calendarRef} className="-m-5 p-5"><TrainingCalendar checkins={periodCheckins} /></div>
        </div>
      )}

      <GoalEditorSheet open={goalOpen} onOpenChange={setGoalOpen} goal={goal} />
    </PerformanceReportingShell>
  );
}

