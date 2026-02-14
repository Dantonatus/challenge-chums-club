import { useNavigate } from 'react-router-dom';
import { useBodyScans } from '@/hooks/useBodyScans';
import { Dumbbell, ScanLine } from 'lucide-react';
import BodyScanCsvUploader from '@/components/bodyscan/BodyScanCsvUploader';
import BodyScanKPICards from '@/components/bodyscan/BodyScanKPICards';
import CompositionTrendChart from '@/components/bodyscan/CompositionTrendChart';
import FatMuscleAreaChart from '@/components/bodyscan/FatMuscleAreaChart';
import SegmentMuscleChart from '@/components/bodyscan/SegmentMuscleChart';
import SegmentFatChart from '@/components/bodyscan/SegmentFatChart';
import MetabolismCard from '@/components/bodyscan/MetabolismCard';
import ScanTimeline from '@/components/bodyscan/ScanTimeline';

export default function BodyScanPage() {
  const { scans, isLoading, importScan } = useBodyScans();
  const navigate = useNavigate();

  const handleImport = async (scan: Parameters<typeof importScan.mutateAsync>[0]) => {
    return importScan.mutateAsync(scan);
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
          </div>
        </div>
        <BodyScanCsvUploader onImport={handleImport} isLoading={importScan.isPending} />
      </div>

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
          <div className="-m-3 p-3"><BodyScanKPICards scans={scans} /></div>
          <div className="-m-3 p-3"><CompositionTrendChart scans={scans} /></div>
          <div className="-m-3 p-3"><FatMuscleAreaChart scans={scans} /></div>
          <div className="-m-3 p-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SegmentMuscleChart scans={scans} />
            <SegmentFatChart scans={scans} />
          </div>
          <div className="-m-3 p-3"><MetabolismCard scans={scans} /></div>
          <div className="-m-3 p-3"><ScanTimeline scans={scans} /></div>
        </>
      )}
    </div>
  );
}
