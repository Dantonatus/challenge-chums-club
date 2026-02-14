import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { parseCsv } from '@/lib/training/csvParser';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onImport: (rows: ReturnType<typeof parseCsv>) => Promise<number>;
  isLoading: boolean;
}

export default function CsvUploader({ onImport, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast({ title: 'Keine gültigen Einträge gefunden', variant: 'destructive' });
      return;
    }
    try {
      const count = await onImport(rows);
      toast({ title: `${count} Check-ins importiert` });
    } catch (err: any) {
      toast({ title: 'Import fehlgeschlagen', description: err.message, variant: 'destructive' });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isLoading}>
        <Upload className="mr-2 h-4 w-4" />
        CSV importieren
      </Button>
    </>
  );
}
