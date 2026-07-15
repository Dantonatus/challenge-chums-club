import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useBodyScans } from '@/hooks/useBodyScans';
import { useHealthGoal } from '@/hooks/useHealthGoal';
import { ScanLine, FileDown, Loader2, Hash, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportBodyScanPDF } from '@/lib/bodyscan/exportBodyScanPDF';
import BodyScanCsvUploader from '@/components/bodyscan/BodyScanCsvUploader';
import BodyScanKPICards from '@/components/bodyscan/BodyScanKPICards';
import CompositionTrendChart from '@/components/bodyscan/CompositionTrendChart';
import FatMuscleAreaChart from '@/components/bodyscan/FatMuscleAreaChart';
import SegmentMuscleChart from '@/components/bodyscan/SegmentMuscleChart';
import SegmentFatChart from '@/components/bodyscan/SegmentFatChart';
import MetabolismCard from '@/components/bodyscan/MetabolismCard';
import ScanTimeline from '@/components/bodyscan/ScanTimeline';
import AnatomyFigure from '@/components/bodyscan/AnatomyFigure';
import { PerformanceReportingShell } from '@/components/health/PerformanceReportingShell';
import { GoalEditorSheet } from '@/components/health/GoalEditorSheet';
import { EmptyInsightState } from '@/components/health/EmptyInsightState';
import { useReporting } from '@/contexts/ReportingContext';
import { filterByPeriod, parseLocalDate } from '@/lib/health/periods';


export default function BodyScanPage() {
  const { scans, isLoading, importScan } = useBodyScans();
  const { goal } = useHealthGoal();
  const { period } = useReporting();
  const [exporting, setExporting] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [goalOpen, setGoalOpen] = useState(false);

  const filteredScans = useMemo(() => filterByPeriod(scans, period, 'scan_date'), [scans, period]);

  useEffect(() => {
    setSelectedIndex(filteredScans.length > 0 ? filteredScans.length - 1 : -1);
  }, [filteredScans.length]);

  const selectedScan = filteredScans[selectedIndex] ?? null;
  const previousScan = selectedIndex > 0 ? filteredScans[selectedIndex - 1] : null;

  const kpiRef = useRef<HTMLDivElement>(null);
  const compositionRef = useRef<HTMLDivElement>(null);
  const fatMuscleRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef<HTMLDivElement>(null);
  const anatomyRef = useRef<HTMLDivElement>(null);
  const metabolismRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const pdfSections = [
    { label: 'Kennzahlen', ref: kpiRef },
    { label: 'Körperkomposition – Verlauf', ref: compositionRef },
    { label: 'Körperfett vs. Muskelmasse – Trend', ref: fatMuscleRef },
    { label: 'Segment-Analyse', ref: segmentsRef },
    { label: 'Anatomie-Übersicht', ref: anatomyRef },
    { label: 'Stoffwechsel', ref: metabolismRef },
    { label: 'Scan-Verlauf', ref: timelineRef },
  ];

  const handleImport = (scan: Parameters<typeof importScan.mutateAsync>[0]) => importScan.mutateAsync(scan);

  const handleExport = async () => {
    setExporting(true);
    const prevLabels = showLabels;
    try {
      if (!showLabels) {
        setShowLabels(true);
        await new Promise((r) => setTimeout(r, 400));
      }
      const isDark = document.documentElement.classList.contains('dark');
      const bgColor = isDark ? '#141414' : '#fcfcfa';
      const images: { label: string; dataUrl: string }[] = [];
      for (const section of pdfSections) {
        if (!section.ref.current) continue;
        const dataUrl = await toPng(section.ref.current, { pixelRatio: 3, backgroundColor: bgColor });
        images.push({ label: section.label, dataUrl });
      }
      await exportBodyScanPDF(filteredScans, images);
    } finally {
      setShowLabels(prevLabels);
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  const latestScanDate = scans.length ? parseLocalDate(scans[scans.length - 1].scan_date) : null;

  return (
    <PerformanceReportingShell
      title="Körper"
      context="Zusammensetzung, Segmente und Stoffwechsel aus deinen TANITA-Scans."
      updatedAt={latestScanDate}
      sources={[{ label: 'Scans', count: filteredScans.length }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Ziel
          </Button>
          {scans.length > 0 && (
            <>
              <Button
                variant={showLabels ? 'default' : 'outline'}
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowLabels((v) => !v)}
                title="Datenwerte anzeigen"
              >
                <Hash className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
            </>
          )}
          <BodyScanCsvUploader onImport={handleImport} isLoading={importScan.isPending} />
        </>
      }
    >
      {isLoading ? (
        <div className="rounded-2xl border border-health-hairline bg-health-surface p-10 text-center text-health-ink-muted">Lade Daten…</div>
      ) : filteredScans.length === 0 ? (
        <EmptyInsightState
          icon={<ScanLine className="h-5 w-5" />}
          title={scans.length === 0 ? 'Noch keine Body-Scan-Daten' : 'Keine Scans im gewählten Zeitraum'}
          description="Importiere TANITA CSV-Dateien oder wähle einen längeren Zeitraum."
        />
      ) : (
        <div className="space-y-6">
          {filteredScans.length > 1 && selectedScan && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={selectedIndex <= 0} onClick={() => setSelectedIndex((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[200px] text-center">
                <div className="text-sm font-semibold">{formatDate(selectedScan.scan_date)} — {selectedScan.device}</div>
                <div className="text-xs text-health-ink-muted">{selectedIndex + 1} von {filteredScans.length}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={selectedIndex >= filteredScans.length - 1} onClick={() => setSelectedIndex((i) => i + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="-m-5 p-5" ref={kpiRef}><BodyScanKPICards scans={filteredScans} selectedScan={selectedScan} /></div>
          <div className="-m-5 p-5" ref={compositionRef}><CompositionTrendChart scans={filteredScans} showLabels={showLabels} /></div>
          <div className="-m-5 p-5" ref={fatMuscleRef}><FatMuscleAreaChart scans={filteredScans} showLabels={showLabels} /></div>
          <div className="-m-5 p-5 grid grid-cols-1 lg:grid-cols-2 gap-6" ref={segmentsRef}>
            <SegmentMuscleChart scans={filteredScans} showLabels={showLabels} />
            <SegmentFatChart scans={filteredScans} showLabels={showLabels} />
          </div>
          <div className="-m-5 p-5" ref={anatomyRef}><AnatomyFigure scans={filteredScans} selectedScan={selectedScan} previousScan={previousScan} /></div>
          <div className="-m-5 p-5" ref={metabolismRef}><MetabolismCard scans={filteredScans} selectedScan={selectedScan} /></div>
          <div className="-m-5 p-5" ref={timelineRef}><ScanTimeline scans={filteredScans} selectedIndex={selectedIndex} onSelectIndex={setSelectedIndex} /></div>
        </div>
      )}

      <GoalEditorSheet open={goalOpen} onOpenChange={setGoalOpen} goal={goal} />
    </PerformanceReportingShell>
  );
}

