import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toJpeg } from 'html-to-image';
import { useBodyScans } from '@/hooks/useBodyScans';
import { Dumbbell, ScanLine, FileDown, Loader2, Scale, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function BodyScanPage() {
  const { scans, isLoading, importScan } = useBodyScans();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Keep selectedIndex in sync with scans length (default to latest)
  useEffect(() => {
    if (scans.length > 0 && selectedIndex === -1) {
      setSelectedIndex(scans.length - 1);
    }
  }, [scans.length, selectedIndex]);

  const selectedScan = scans[selectedIndex] ?? null;
  const previousScan = selectedIndex > 0 ? scans[selectedIndex - 1] : null;

  const kpiRef = useRef<HTMLDivElement>(null);
  const compositionRef = useRef<HTMLDivElement>(null);
  const fatMuscleRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef<HTMLDivElement>(null);
  const anatomyRef = useRef<HTMLDivElement>(null);
  const metabolismRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const pdfSections = [
    { label: 'KPIs', ref: kpiRef },
    { label: 'Zusammensetzung', ref: compositionRef },
    { label: 'Fett & Muskel Trend', ref: fatMuscleRef },
    { label: 'Segment-Analyse', ref: segmentsRef },
    { label: 'Anatomie', ref: anatomyRef },
    { label: 'Stoffwechsel', ref: metabolismRef },
    { label: 'Scan-Verlauf', ref: timelineRef },
  ];

  const handleImport = async (scan: Parameters<typeof importScan.mutateAsync>[0]) => {
    return importScan.mutateAsync(scan);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const bgColor = isDark ? '#141414' : '#fcfcfa';

      const images: { label: string; dataUrl: string }[] = [];
      for (const section of pdfSections) {
        if (!section.ref.current) continue;
        const dataUrl = await toJpeg(section.ref.current, {
          quality: 0.85,
          pixelRatio: 1.5,
          backgroundColor: bgColor,
        });
        images.push({ label: section.label, dataUrl });
      }

      await exportBodyScanPDF(scans, images);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
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
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-background text-foreground shadow-sm"
            >
              <ScanLine className="h-3.5 w-3.5 inline mr-1" />
              Body Scan
            </button>
            <button
              onClick={() => navigate('/app/training/weight')}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground"
            >
              <Scale className="h-3.5 w-3.5 inline mr-1" />
              Gewicht
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scans.length > 0 && (
            <>
              <Button
                variant={showLabels ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowLabels(v => !v)}
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
        </div>
      </div>

      {/* Scan Navigator */}
      {scans.length > 1 && selectedScan && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={selectedIndex <= 0}
            onClick={() => setSelectedIndex(i => i - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <div className="text-sm font-semibold">
              {formatDate(selectedScan.scan_date)} — {selectedScan.device}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedIndex + 1} von {scans.length}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={selectedIndex >= scans.length - 1}
            onClick={() => setSelectedIndex(i => i + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Lade Daten…</div>
      ) : scans.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <ScanLine className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Noch keine Body-Scan-Daten vorhanden.</p>
          <p className="text-sm text-muted-foreground">Importiere eine oder mehrere TANITA CSV-Dateien.</p>
        </div>
      ) : (
        <>
          <div className="-m-3 p-3" ref={kpiRef}><BodyScanKPICards scans={scans} selectedScan={selectedScan} /></div>
          <div className="-m-3 p-3" ref={compositionRef}><CompositionTrendChart scans={scans} showLabels={showLabels} /></div>
          <div className="-m-3 p-3" ref={fatMuscleRef}><FatMuscleAreaChart scans={scans} showLabels={showLabels} /></div>
          <div className="-m-3 p-3 grid grid-cols-1 lg:grid-cols-2 gap-6" ref={segmentsRef}>
            <SegmentMuscleChart scans={scans} showLabels={showLabels} />
            <SegmentFatChart scans={scans} showLabels={showLabels} />
          </div>
          <div className="-m-3 p-3" ref={anatomyRef}><AnatomyFigure scans={scans} selectedScan={selectedScan} previousScan={previousScan} /></div>
          <div className="-m-3 p-3" ref={metabolismRef}><MetabolismCard scans={scans} selectedScan={selectedScan} /></div>
          <div className="-m-3 p-3" ref={timelineRef}><ScanTimeline scans={scans} selectedIndex={selectedIndex} onSelectIndex={setSelectedIndex} /></div>
        </>
      )}
    </div>
  );
}
