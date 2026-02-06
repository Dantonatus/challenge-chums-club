import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileImage, FileText, Download, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExportFormat = 'png' | 'pdf';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat) => Promise<void>;
  periodLabel: string;
}

export function ExportDialog({ open, onOpenChange, onExport, periodLabel }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(format);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Export: {periodLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as ExportFormat)}
            className="grid grid-cols-2 gap-4"
          >
            {/* PNG Option */}
            <Label
              htmlFor="png"
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                format === 'png' 
                  ? "border-primary bg-primary/10 shadow-sm" 
                  : "border-muted"
              )}
            >
              <RadioGroupItem value="png" id="png" className="sr-only" />
              <div className={cn(
                "p-3 rounded-xl",
                format === 'png' ? "bg-primary/20" : "bg-muted"
              )}>
                <FileImage className={cn(
                  "h-8 w-8",
                  format === 'png' ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-center">
                <p className="font-semibold">PNG</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hochauflösendes Bild
                </p>
              </div>
            </Label>

            {/* PDF Option */}
            <Label
              htmlFor="pdf"
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                format === 'pdf' 
                  ? "border-primary bg-primary/10 shadow-sm" 
                  : "border-muted"
              )}
            >
              <RadioGroupItem value="pdf" id="pdf" className="sr-only" />
              <div className={cn(
                "p-3 rounded-xl",
                format === 'pdf' ? "bg-primary/20" : "bg-muted"
              )}>
                <FileText className={cn(
                  "h-8 w-8",
                  format === 'pdf' ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-center">
                <p className="font-semibold">PDF</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Druckfertiges Dokument
                </p>
              </div>
            </Label>
          </RadioGroup>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            {format === 'png' ? (
              <p>Exportiert die aktuelle Ansicht als hochauflösendes PNG-Bild (2x Retina-Qualität) – ideal für Präsentationen.</p>
            ) : (
              <p>Erstellt ein druckfertiges A4-PDF im Querformat mit der aktuellen Planungsansicht.</p>
            )}
          </div>

          {/* Export Button */}
          <Button 
            onClick={handleExport} 
            className="w-full h-12 text-base font-medium"
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Wird exportiert...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                {format === 'png' ? 'Als PNG herunterladen' : 'Als PDF herunterladen'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
