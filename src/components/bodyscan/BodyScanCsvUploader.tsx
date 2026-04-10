import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { parseBodyScanCsv } from '@/lib/bodyscan/csvParser';
import { parseBodyScanPdf } from '@/lib/bodyscan/pdfParser';
import { useToast } from '@/hooks/use-toast';
import type { ParsedBodyScan } from '@/lib/bodyscan/types';

interface Props {
  onImport: (scan: ParsedBodyScan) => Promise<number>;
  isLoading: boolean;
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n');
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
      try {
        let scan: ParsedBodyScan | null = null;

        if (file.name.toLowerCase().endsWith('.pdf')) {
          const buffer = await file.arrayBuffer();
          const text = await extractPdfText(buffer);
          scan = parseBodyScanPdf(text);
        } else {
          const text = await file.text();
          scan = parseBodyScanCsv(text);
        }

        if (!scan) {
          failed++;
          continue;
        }

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
      <input ref={inputRef} type="file" accept=".csv,.pdf" multiple className="hidden" onChange={handleFiles} />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isLoading}>
        <Upload className="mr-2 h-4 w-4" />
        Importieren
      </Button>
    </>
  );
}
