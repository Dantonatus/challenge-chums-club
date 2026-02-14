import { useState } from 'react';
import { FeedbackEntry } from '@/lib/feedback/types';
import { CategoryChip } from './CategoryChip';
import { SENTIMENTS } from '@/lib/feedback/constants';
import { cn } from '@/lib/utils';
import { Archive, Check, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  entry: FeedbackEntry;
  onToggleShared: (id: string, is_shared: boolean) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  readOnly?: boolean;
}

export function FeedbackEntryCard({ entry, onToggleShared, onUpdate, onDelete, onArchive, readOnly }: Props) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const sentiment = SENTIMENTS.find(s => s.value === entry.sentiment);

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(entry.id, editContent.trim());
      setEditing(false);
    }
  };

  const dateStr = (() => {
    try {
      const [y, m, d] = entry.entry_date.split('-').map(Number);
      return format(new Date(y, m - 1, d), 'd. MMM yyyy', { locale: de });
    } catch {
      return entry.entry_date;
    }
  })();

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        {/* Sentiment dot */}
        <div className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', sentiment?.dotColor ?? 'bg-slate-400')} />

        <div className="min-w-0 flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{dateStr}</span>
            <CategoryChip value={entry.category as any} />
            {entry.is_shared && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> Geteilt
              </span>
            )}
          </div>

          {/* Content */}
          {editing ? (
            <div className="space-y-2">
              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[60px] text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={!editContent.trim()}>Speichern</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditContent(entry.content); }}>Abbrechen</Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-foreground">{entry.content}</p>
          )}
        </div>

        {/* Actions */}
        {!editing && !readOnly && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onArchive && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onArchive(entry.id)} title="Archivieren">
                <Archive className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(entry.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
