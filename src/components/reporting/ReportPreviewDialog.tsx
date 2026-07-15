import { useMemo, useState, useCallback } from 'react';
import { Loader2, FileDown, AlertCircle, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ReportModel } from '@/lib/reporting/types';
import { renderReportPdf, ReportRenderError } from '@/lib/reporting/renderReportPdf';

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: ReportModel | null;
}

export function ReportPreviewDialog({ open, onOpenChange, model }: ReportPreviewDialogProps) {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set());
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialise selection when model changes: enable every non-required section by default
  useMemo(() => {
    if (!model) return;
    const next = new Set<string>();
    for (const s of model.sections) next.add(s.id);
    setEnabled(next);
    setError(null);
    setProgress(null);
  }, [model]);

  const toggle = (id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDownload = useCallback(async () => {
    if (!model) return;
    setError(null);
    setProgress({ label: 'Starte', pct: 0.02 });
    try {
      const result = await renderReportPdf(model, {
        enabledSectionIds: enabled,
        onProgress: (label, pct) => setProgress({ label, pct }),
      });
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Report erstellt (${result.pageCount} Seite${result.pageCount === 1 ? '' : 'n'})`);
      setProgress(null);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof ReportRenderError
        ? err.message
        : `Unerwarteter Fehler beim Erstellen des Reports: ${(err as Error).message}`;
      console.error('[reporting] renderReportPdf failed', err);
      setError(msg);
      setProgress(null);
      toast.error(msg);
    }
  }, [model, enabled, onOpenChange]);

  if (!model) return null;

  const disabledDownload = !!progress || (model.sections.length > 0 && enabled.size === 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!progress) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {model.title}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline">{model.period.label}</Badge>
            {model.period.comparisonLabel && (
              <Badge variant="secondary">{model.period.comparisonLabel}</Badge>
            )}
            {model.updatedAt && (
              <span className="text-xs text-muted-foreground">
                Datenstand: {model.updatedAt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {model.emptyReason ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Report kann nicht erstellt werden</div>
              <p className="mt-1 text-xs opacity-90">{model.emptyReason}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executive Summary (Pflicht)</div>
              <p className="mt-1 text-foreground">{model.executiveSummary.headline}</p>
            </div>

            {model.sections.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektionen</div>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setEnabled(new Set(model.sections.map(s => s.id)))}
                  >
                    Alle aktivieren
                  </button>
                </div>
                <ScrollArea className="h-[220px] rounded-md border">
                  <ul className="divide-y">
                    {model.sections.map(s => {
                      const checked = enabled.has(s.id);
                      return (
                        <li key={s.id} className="flex items-start gap-3 p-3 text-sm">
                          <Checkbox
                            id={`sec-${s.id}`}
                            checked={checked}
                            onCheckedChange={() => toggle(s.id)}
                            className="mt-0.5"
                          />
                          <label htmlFor={`sec-${s.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-foreground">{s.title}</div>
                            {s.summary && <div className="text-xs text-muted-foreground line-clamp-2">{s.summary}</div>}
                          </label>
                          {s.chart && <Badge variant="outline" className="text-[10px]">Chart</Badge>}
                          {s.table && <Badge variant="outline" className="text-[10px]">Tabelle</Badge>}
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {model.dataQuality.length > 0 && (
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-2 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                <div className="font-medium">Datenqualität-Hinweise</div>
                <ul className="mt-1 list-disc pl-4">
                  {model.dataQuality.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}

            {progress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{progress.label}</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(progress.pct * 100)} %</span>
                </div>
                <Progress value={progress.pct * 100} />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!progress}>
            Abbrechen
          </Button>
          <Button
            onClick={handleDownload}
            disabled={disabledDownload || !!model.emptyReason}
          >
            {progress
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <FileDown className="mr-2 h-4 w-4" />}
            PDF herunterladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
