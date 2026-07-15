import { useEffect, useMemo, useState } from 'react';
import { useBodyScans } from '@/hooks/useBodyScans';
import { useHealthGoal } from '@/hooks/useHealthGoal';
import { ScanLine, FileDown, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportPreviewDialog } from '@/components/reporting/ReportPreviewDialog';
import { buildBodyScanReportModel } from '@/lib/reporting/buildBodyScanReportModel';
import BodyScanCsvUploader from '@/components/bodyscan/BodyScanCsvUploader';
import { PerformanceReportingShell } from '@/components/health/PerformanceReportingShell';
import { GoalEditorSheet } from '@/components/health/GoalEditorSheet';
import { EmptyInsightState } from '@/components/health/EmptyInsightState';
import { useReporting } from '@/contexts/ReportingContext';
import { filterByPeriod, parseLocalDate } from '@/lib/health/periods';
import {
  buildBodyScanInsights,
  buildRecompositionBridge,
  buildRecompositionQuadrant,
  formatGermanDate,
  type BaselineMode,
} from '@/lib/bodyscan/analytics';
import { RecompositionBrief } from '@/components/bodyscan/RecompositionBrief';
import { BaselineSelector } from '@/components/bodyscan/BaselineSelector';
import { CompositionBridge } from '@/components/bodyscan/CompositionBridge';
import { JourneySmallMultiples } from '@/components/bodyscan/JourneySmallMultiples';
import { RecompositionQuadrant } from '@/components/bodyscan/RecompositionQuadrant';
import { AnatomyIntelligence } from '@/components/bodyscan/AnatomyIntelligence';
import { MetabolismDeltas } from '@/components/bodyscan/MetabolismDeltas';
import { ScanJourneyTimeline } from '@/components/bodyscan/ScanJourneyTimeline';

export default function BodyScanPage() {
  const { scans, isLoading, importScan } = useBodyScans();
  const { goal } = useHealthGoal();
  const { period } = useReporting();
  const [reportOpen, setReportOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const filteredScans = useMemo(
    () => filterByPeriod(scans, period, 'scan_date'),
    [scans, period],
  );

  const [currentIdx, setCurrentIdx] = useState(-1);
  const [baselineMode, setBaselineMode] = useState<BaselineMode>('previous');
  const [customBaselineId, setCustomBaselineId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIdx(filteredScans.length > 0 ? filteredScans.length - 1 : -1);
  }, [filteredScans.length]);

  const currentScan = filteredScans[currentIdx] ?? null;

  const baselineScan = useMemo(() => {
    if (!currentScan) return null;
    if (baselineMode === 'previous') {
      return currentIdx > 0 ? filteredScans[currentIdx - 1] : null;
    }
    if (baselineMode === 'first') {
      return filteredScans[0]?.id !== currentScan.id ? filteredScans[0] : null;
    }
    if (customBaselineId) {
      const c = filteredScans.find(s => s.id === customBaselineId);
      return c && c.id !== currentScan.id ? c : null;
    }
    return null;
  }, [baselineMode, customBaselineId, currentScan, filteredScans, currentIdx]);

  const baselineLabel = baselineScan
    ? `vs. ${formatGermanDate(baselineScan.scan_date)}`
    : 'kein Vergleich gewählt';

  const insight = useMemo(
    () => buildBodyScanInsights(currentScan, baselineScan, goal),
    [currentScan, baselineScan, goal],
  );
  const bridge = useMemo(
    () => (currentScan && baselineScan ? buildRecompositionBridge(currentScan, baselineScan) : null),
    [currentScan, baselineScan],
  );
  const quadrantPoints = useMemo(
    () => (baselineScan ? buildRecompositionQuadrant(filteredScans, baselineScan) : []),
    [filteredScans, baselineScan],
  );

  const captureRef = useRef<HTMLDivElement>(null);

  const handleImport = (scan: Parameters<typeof importScan.mutateAsync>[0]) =>
    importScan.mutateAsync(scan);

  const handleExport = async () => {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: isDark ? '#141414' : '#fcfcfa',
      });
      await exportBodyScanPDF(filteredScans, [{ label: 'Recomposition Intelligence', dataUrl }]);
    } finally {
      setExporting(false);
    }
  };

  const latestScanDate = scans.length
    ? parseLocalDate(scans[scans.length - 1].scan_date)
    : null;

  return (
    <PerformanceReportingShell
      title="Körper"
      context="Recomposition Intelligence auf Basis deiner TANITA-Scans."
      updatedAt={latestScanDate}
      sources={[{ label: 'Scans', count: filteredScans.length }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Ziel
          </Button>
          {scans.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileDown className="mr-1.5 h-3.5 w-3.5" />}
              PDF
            </Button>
          )}
          <BodyScanCsvUploader onImport={handleImport} isLoading={importScan.isPending} />
        </>
      }
    >
      {isLoading ? (
        <div className="rounded-2xl border border-health-hairline bg-health-surface p-10 text-center text-health-ink-muted">
          Lade Daten…
        </div>
      ) : filteredScans.length === 0 || !currentScan ? (
        <EmptyInsightState
          icon={<ScanLine className="h-5 w-5" />}
          title={scans.length === 0 ? 'Noch keine Body-Scan-Daten' : 'Keine Scans im gewählten Zeitraum'}
          description="Importiere TANITA CSV-Dateien oder wähle einen längeren Zeitraum."
        />
      ) : (
        <div ref={captureRef} className="-m-5 space-y-6 p-5">
          {/* Header: Baseline + Scan-Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-health-hairline bg-health-surface p-4">
            <BaselineSelector
              scans={filteredScans}
              currentScan={currentScan}
              baselineMode={baselineMode}
              customBaselineId={customBaselineId}
              onChange={(m, id) => {
                setBaselineMode(m);
                if (m === 'custom') setCustomBaselineId(id ?? customBaselineId);
              }}
            />

            {filteredScans.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentIdx <= 0}
                  onClick={() => setCurrentIdx(i => i - 1)}
                  aria-label="Vorheriger Scan"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[180px] text-center">
                  <div className="text-sm font-semibold text-health-ink">
                    {formatGermanDate(currentScan.scan_date)}
                  </div>
                  <div className="text-[10px] text-health-ink-subtle">
                    Scan {currentIdx + 1} von {filteredScans.length} · {currentScan.device || 'Gerät ?'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentIdx >= filteredScans.length - 1}
                  onClick={() => setCurrentIdx(i => i + 1)}
                  aria-label="Nächster Scan"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <RecompositionBrief insight={insight} baselineLabel={baselineLabel} />

          {bridge && <CompositionBridge bridge={bridge} baselineLabel={baselineLabel} />}

          <JourneySmallMultiples
            scans={filteredScans}
            baseline={baselineScan}
            current={currentScan}
          />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            {baselineScan && quadrantPoints.length >= 2 ? (
              <RecompositionQuadrant
                points={quadrantPoints}
                currentScanId={currentScan.id}
                goalMode={goal?.goal_mode ?? null}
              />
            ) : (
              <div className="rounded-2xl border border-health-hairline bg-health-surface p-6 text-sm text-health-ink-muted">
                Für die Fett/Muskel-Quadrant-Sicht werden mindestens zwei vergleichbare Scans mit Kernfeldern benötigt.
              </div>
            )}
            <MetabolismDeltas current={currentScan} baseline={baselineScan} />
          </div>

          <AnatomyIntelligence scans={filteredScans} currentScan={currentScan} baseline={baselineScan} />

          <ScanJourneyTimeline
            scans={filteredScans}
            currentScanId={currentScan.id}
            baselineScanId={baselineScan?.id ?? null}
            onSetCurrent={(id) => {
              const idx = filteredScans.findIndex(s => s.id === id);
              if (idx >= 0) setCurrentIdx(idx);
            }}
            onSetBaseline={(id) => {
              setBaselineMode('custom');
              setCustomBaselineId(id);
            }}
          />
        </div>
      )}

      <GoalEditorSheet open={goalOpen} onOpenChange={setGoalOpen} goal={goal} />
    </PerformanceReportingShell>
  );
}
