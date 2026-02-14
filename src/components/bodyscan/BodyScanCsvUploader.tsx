import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { parseBodyScanCsv } from '@/lib/bodyscan/csvParser';
import { useToast } from '@/hooks/use-toast';
import type { ParsedBodyScan } from '@/lib/bodyscan/types';

interface Props {
  onImport: (scan: ParsedBodyScan) => Promise<number>;
  isLoading: boolean;
}

export default function BodyScanCsvUploader({ onImport, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let imported = 0;
    let failed = 0;

    for (const file of Array.from(files)) {
      const text = await file.text();
      const scan = parseBodyScanCsv(text);
      if (!scan) {
        failed++;
        continue;
      }
      try {
        await onImport(scan);
        imported++;
      } catch {
        failed++;
      }
    }

    if (imported > 0) {
      toast({ title: `${imported} Scan${imported > 1 ? 's' : ''} importiert` });
    }
    if (failed > 0) {
      toast({ title: `${failed} Datei${failed > 1 ? 'en' : ''} fehlgeschlagen`, variant: 'destructive' });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={handleFiles} />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isLoading}>
        <Upload className="mr-2 h-4 w-4" />
        CSV importieren
      </Button>
    </>
  );
}
