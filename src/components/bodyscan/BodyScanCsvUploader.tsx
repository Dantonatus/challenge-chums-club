import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { parseBodyScanCsv } from '@/lib/bodyscan/csvParser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ParsedBodyScan } from '@/lib/bodyscan/types';

interface Props {
  onImport: (scan: ParsedBodyScan) => Promise<number>;
  isLoading: boolean;
}

async function renderPdfPagesToImages(buffer: ArrayBuffer): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const scale = 2; // High resolution for OCR
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.9));
    canvas.remove();
  }

  return images;
}

async function parsePdfViaVision(images: string[]): Promise<ParsedBodyScan | null> {
  const { data, error } = await supabase.functions.invoke('parse-bodyscan-pdf', {
    body: { images },
  });

  if (error) {
    console.error('Edge function error:', error);
    return null;
  }

  const scan = data?.scan;
  if (!scan || !scan.scan_date) return null;

  return {
    scan_date: scan.scan_date,
    scan_time: scan.scan_time || '00:00:00',
    device: scan.device || 'TANITA MC-780',
    age_years: scan.age_years ?? null,
    height_cm: scan.height_cm ?? null,
    weight_kg: scan.weight_kg ?? null,
    fat_percent: scan.fat_percent ?? null,
    fat_mass_kg: scan.fat_mass_kg ?? null,
    muscle_mass_kg: scan.muscle_mass_kg ?? null,
    skeletal_muscle_mass_kg: scan.skeletal_muscle_mass_kg ?? null,
    bone_mass_kg: scan.bone_mass_kg ?? null,
    bmi: scan.bmi ?? null,
    metabolic_age: scan.metabolic_age != null ? Math.round(scan.metabolic_age) : null,
    tbw_kg: scan.tbw_kg ?? null,
    tbw_percent: scan.tbw_percent ?? null,
    ecw_kg: scan.ecw_kg ?? null,
    icw_kg: scan.icw_kg ?? null,
    ecw_tbw_ratio: scan.ecw_tbw_ratio ?? null,
    bmr_kcal: scan.bmr_kcal ?? null,
    visceral_fat: scan.visceral_fat != null ? Math.round(scan.visceral_fat) : null,
    physique_text: scan.physique_text ?? null,
    segments_json: scan.segments_json ?? null,
  };
}

export default function BodyScanCsvUploader({ onImport, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let imported = 0;
    let failed = 0;
    setProcessing(true);

    try {
      for (const file of Array.from(files)) {
        try {
          let scan: ParsedBodyScan | null = null;

          if (file.name.toLowerCase().endsWith('.pdf')) {
            toast({ title: 'PDF wird analysiert…', description: 'Die Daten werden per KI ausgelesen.' });
            const buffer = await file.arrayBuffer();
            const images = await renderPdfPagesToImages(buffer);
            scan = await parsePdfViaVision(images);
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
        } catch (err) {
          console.error('Import error:', err);
          failed++;
        }
      }

      if (imported > 0) {
        toast({ title: `${imported} Scan${imported > 1 ? 's' : ''} importiert` });
      }
      if (failed > 0) {
        toast({ title: `${failed} Datei${failed > 1 ? 'en' : ''} fehlgeschlagen`, variant: 'destructive' });
      }
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const busy = isLoading || processing;

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,.pdf" multiple className="hidden" onChange={handleFiles} />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Importieren
      </Button>
    </>
  );
}
