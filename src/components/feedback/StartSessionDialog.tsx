import { useState } from 'react';
import { FeedbackEntry } from '@/lib/feedback/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryChip } from './CategoryChip';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: FeedbackEntry[];
  onSubmit: (data: { session_date: string; notes?: string; entry_ids: string[] }) => void;
  isSubmitting: boolean;
}

export function StartSessionDialog({ open, onOpenChange, entries, onSubmit, isSubmitting }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(entries.map(e => e.id)));
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit({
      session_date: sessionDate,
      notes: notes.trim() || undefined,
      entry_ids: Array.from(selected),
    });
  };

  // Reset state when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setSelected(new Set(entries.map(e => e.id)));
      setSessionDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Feedbackrunde abschließen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Gesprächsdatum</label>
            <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notizen zum Gespräch (optional)</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Wichtige Punkte, Vereinbarungen…"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Einträge auswählen ({selected.size}/{entries.length})</label>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto rounded-md border border-border p-2">
              {entries.map(entry => (
                <label
                  key={entry.id}
                  className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(entry.id)}
                    onCheckedChange={() => toggle(entry.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{entry.entry_date}</span>
                      <CategoryChip value={entry.category as any} />
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{entry.content}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={selected.size === 0 || !sessionDate || isSubmitting}>
            Gespräch abschließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
