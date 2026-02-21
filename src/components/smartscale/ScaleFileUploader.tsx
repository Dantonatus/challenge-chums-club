import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { parseStarfitXls } from '@/lib/smartscale/xlsParser';
import { useToast } from '@/hooks/use-toast';
import type { ParsedScaleEntry } from '@/lib/smartscale/types';

interface Props {
  onImport: (entries: ParsedScaleEntry[]) => Promise<number>;
  isLoading: boolean;
}

export default function ScaleFileUploader({ onImport, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const entries = parseStarfitXls(buffer);

      if (entries.length === 0) {
        toast({ title: 'Keine gültigen Einträge gefunden', variant: 'destructive' });
        return;
      }

      const count = await onImport(entries);
      toast({ title: `${count} Messungen importiert` });
    } catch (err: any) {
      toast({ title: 'Import fehlgeschlagen', description: err.message, variant: 'destructive' });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isLoading}>
        <Upload className="mr-2 h-4 w-4" />
        Waage importieren
      </Button>
    </>
  );
}
