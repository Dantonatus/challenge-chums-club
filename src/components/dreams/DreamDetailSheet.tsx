import { useState, useEffect, KeyboardEvent } from 'react';
import { DreamEntry, MOODS, EMOTIONS, MoodValue, EmotionValue } from '@/lib/dreams/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MoodSelector } from './MoodSelector';
import { EmotionChips } from './EmotionChips';
import { VividnessSlider } from './VividnessSlider';
import { Sparkles, RotateCcw, Trash2, Pencil, Save, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  dream: DreamEntry | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate?: (data: Partial<DreamEntry> & { id: string }) => void;
}

export function DreamDetailSheet({ dream, open, onClose, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodValue | null>(null);
  const [vividness, setVividness] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [isLucid, setIsLucid] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [emotions, setEmotions] = useState<EmotionValue[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (dream) {
      setTitle(dream.title);
      setContent(dream.content ?? '');
      setMood((dream.mood as MoodValue) ?? null);
      setVividness(dream.vividness ?? 3);
      setSleepQuality(dream.sleep_quality ?? 3);
      setIsLucid(dream.is_lucid);
      setIsRecurring(dream.is_recurring);
      setEmotions((dream.emotions as EmotionValue[]) ?? []);
      setTags(dream.tags ?? []);
      setEditing(false);
      setTagInput('');
    }
  }, [dream]);

  if (!dream) return null;
  const moodObj = MOODS.find(m => m.value === dream.mood);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
  };
  const handleTagKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } };

  const handleSave = () => {
    if (!onUpdate) return;
    onUpdate({
      id: dream.id,
      title, content, mood, vividness, sleep_quality: sleepQuality,
      is_lucid: isLucid, is_recurring: isRecurring, emotions, tags,
    });
    setEditing(false);
  };

  return (
    <Sheet open={open} onOpenChange={() => { setEditing(false); onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{moodObj?.emoji ?? '🌙'}</span>
            {editing ? (
              <Input value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-serif" />
            ) : (
              <SheetTitle className="font-serif">{dream.title}</SheetTitle>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(dream.entry_date), 'PPP', { locale: de })}
            {dream.entry_time && ` · ${dream.entry_time.slice(0, 5)}`}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {editing ? (
            <>
              <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[80px] font-serif text-sm" rows={4} placeholder="Beschreibung..." />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Stimmung</span>
                <MoodSelector value={mood} onChange={setMood} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <VividnessSlider value={vividness} onChange={setVividness} />
                <VividnessSlider value={sleepQuality} onChange={setSleepQuality} label="Schlafqualität" />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={isLucid} onCheckedChange={setIsLucid} />
                  <Label className="text-xs flex items-center gap-1"><Sparkles className="w-3 h-3" /> Luzid</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                  <Label className="text-xs flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Wiederkehrend</Label>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Emotionen</span>
                <EmotionChips value={emotions} onChange={setEmotions} />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs flex items-center gap-1">
                      {t}
                      <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} placeholder="+ Tag" className="h-6 w-24 text-xs bg-transparent border-0 border-b border-border/30 rounded-none px-0 focus-visible:ring-0" />
                    {tagInput && <button type="button" onClick={addTag}><Plus className="w-3 h-3 text-primary" /></button>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="w-3.5 h-3.5" /> Speichern</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
              </div>
            </>
          ) : (
            <>
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
              <div className="flex gap-2 mt-4">
                {onUpdate && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => { onDelete(dream.id); onClose(); }} className="gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
