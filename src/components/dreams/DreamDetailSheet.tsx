import { DreamEntry, MOODS, EMOTIONS } from '@/lib/dreams/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  dream: DreamEntry | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function DreamDetailSheet({ dream, open, onClose, onDelete }: Props) {
  if (!dream) return null;
  const moodObj = MOODS.find(m => m.value === dream.mood);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{moodObj?.emoji ?? '🌙'}</span>
            <SheetTitle className="font-serif">{dream.title}</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(dream.entry_date), 'PPP', { locale: de })}
            {dream.entry_time && ` · ${dream.entry_time.slice(0, 5)}`}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {dream.content && (
            <p className="text-sm leading-relaxed font-serif whitespace-pre-wrap">{dream.content}</p>
          )}

          <div className="flex gap-4 text-xs text-muted-foreground">
            {dream.is_lucid && <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" /> Luzider Traum</span>}
            {dream.is_recurring && <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3 text-blue-400" /> Wiederkehrend</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Lebendigkeit</span>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(d => (
                  <div key={d} className={`w-4 h-4 rounded-full ${d <= (dream.vividness??0) ? 'bg-primary' : 'bg-muted/30'}`} />
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Schlafqualität</span>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(d => (
                  <span key={d} className={d <= (dream.sleep_quality??0) ? 'text-amber-400' : 'text-muted/30'}>★</span>
                ))}
              </div>
            </div>
          </div>

          {dream.emotions && dream.emotions.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Emotionen</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {dream.emotions.map(e => {
                  const em = EMOTIONS.find(x => x.value === e);
                  return <span key={e} className={`px-2 py-0.5 rounded-full text-xs border ${em?.color ?? 'bg-muted'}`}>{em?.label ?? e}</span>;
                })}
              </div>
            </div>
          )}

          {dream.tags && dream.tags.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {dream.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}

          <Button variant="destructive" size="sm" onClick={() => { onDelete(dream.id); onClose(); }} className="gap-1.5 mt-4">
            <Trash2 className="w-3.5 h-3.5" /> Löschen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
