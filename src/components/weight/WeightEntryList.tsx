import { useState } from 'react';
import { Pencil, Trash2, Check, X, Scale } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { WeightEntry } from '@/lib/weight/types';
import type { UnifiedWeightEntry } from '@/lib/weight/unifiedTimeline';

interface Props {
  entries: (WeightEntry | UnifiedWeightEntry)[];
  onUpdate: (id: string, weight_kg: number) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function isUnified(entry: WeightEntry | UnifiedWeightEntry): entry is UnifiedWeightEntry {
  return 'source' in entry;
}

export default function WeightEntryList({ entries, onUpdate, onDelete }: Props) {
  const [visibleCount, setVisibleCount] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteEntry, setDeleteEntry] = useState<(WeightEntry | UnifiedWeightEntry) | null>(null);

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const visible = sorted.slice(0, visibleCount);

  const startEdit = (entry: WeightEntry | UnifiedWeightEntry) => {
    setEditingId(entry.id);
    setEditValue(String(entry.weight_kg));
  };

  const confirmEdit = () => {
    if (!editingId) return;
    const val = parseFloat(editValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    onUpdate(editingId, val);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Letzte Einträge</h3>
        <span className="text-xs text-muted-foreground">{entries.length} gesamt</span>
      </div>

      <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
        {visible.map((entry) => {
          const source = isUnified(entry) ? entry.source : 'manual';
          const isScale = source === 'scale';

          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
            >
              {/* Source icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0 w-5 flex justify-center">
                    {isScale ? (
                      <Scale className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Pencil className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isScale ? 'Smart Scale Import' : 'Manueller Eintrag'}
                </TooltipContent>
              </Tooltip>

              <span className="text-muted-foreground w-20 shrink-0">{formatDate(entry.date)}</span>
              <span className="text-muted-foreground w-12 shrink-0">{entry.time}</span>

              {editingId === entry.id ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="h-7 w-20 text-sm"
                    autoFocus
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                  <button onClick={confirmEdit} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={cancelEdit} className="p-1 text-muted-foreground hover:bg-muted rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-foreground flex-1">{entry.weight_kg} kg</span>
                  {!isScale && (
                    <>
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ opacity: undefined }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteEntry(entry)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length > visibleCount && (
        <div className="px-4 py-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setVisibleCount((c) => c + 30)}
          >
            Mehr anzeigen ({sorted.length - visibleCount} weitere)
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteEntry && `Gewichtseintrag vom ${formatDate(deleteEntry.date)} (${deleteEntry.weight_kg} kg) unwiderruflich löschen?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteEntry) onDelete(deleteEntry.id);
                setDeleteEntry(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
