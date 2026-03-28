import { useState, KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MoodSelector } from './MoodSelector';
import { EmotionChips } from './EmotionChips';
import { VividnessSlider } from './VividnessSlider';
import { MoodValue, EmotionValue } from '@/lib/dreams/types';
import { MOODS } from '@/lib/dreams/types';
import { Moon, Sparkles, RotateCcw, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Props {
  onSave: (data: {
    title: string;
    content: string;
    mood: MoodValue | null;
    vividness: number;
    sleep_quality: number;
    is_lucid: boolean;
    is_recurring: boolean;
    emotions: EmotionValue[];
    tags: string[];
  }) => void;
  isPending?: boolean;
}

export function DreamCapture({ onSave, isPending }: Props) {
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
  const [expanded, setExpanded] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleTagKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error('Gib deinem Traum einen Titel'); return; }
    onSave({ title: title.trim(), content, mood, vividness, sleep_quality: sleepQuality, is_lucid: isLucid, is_recurring: isRecurring, emotions, tags });
    setTitle(''); setContent(''); setMood(null); setVividness(3); setSleepQuality(3);
    setIsLucid(false); setIsRecurring(false); setEmotions([]); setTags([]); setExpanded(false);
  };

  const moodObj = mood ? MOODS.find(m => m.value === mood) : null;

  return (
    <motion.div layout>
      <Card className="relative overflow-hidden backdrop-blur-xl bg-card/60 border-border/50">
        {/* Mood gradient overlay */}
        <AnimatePresence>
          {mood && (
            <motion.div
              key={mood}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 bg-gradient-to-br ${moodObj?.gradient ?? ''} pointer-events-none`}
            />
          )}
        </AnimatePresence>

        <CardContent className="pt-6 space-y-4 relative z-10">
          {/* Minimal capture row */}
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-primary shrink-0" />
            <Input
              placeholder="Was hast du geträumt?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-serif bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              onFocus={() => setExpanded(true)}
            />
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <Textarea
                  placeholder="Beschreibe deinen Traum..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[80px] bg-transparent border-border/30 font-serif text-sm resize-none"
                  rows={3}
                />

                {/* Mood */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Stimmung</span>
                  <MoodSelector value={mood} onChange={setMood} />
                </div>

                {/* Vividness + Sleep */}
                <div className="grid grid-cols-2 gap-4">
                  <VividnessSlider value={vividness} onChange={setVividness} />
                  <VividnessSlider value={sleepQuality} onChange={setSleepQuality} label="Schlafqualität" />
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={isLucid} onCheckedChange={setIsLucid} />
                    <Label className="text-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Luzid
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                    <Label className="text-xs flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Wiederkehrend
                    </Label>
                  </div>
                </div>

                {/* Emotions */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Emotionen</span>
                  <EmotionChips value={emotions} onChange={setEmotions} />
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Themen / Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs flex items-center gap-1">
                        {t}
                        <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKey}
                        placeholder="+ Tag"
                        className="h-6 w-24 text-xs bg-transparent border-0 border-b border-border/30 rounded-none px-0 focus-visible:ring-0"
                      />
                      {tagInput && (
                        <button type="button" onClick={addTag}>
                          <Plus className="w-3 h-3 text-primary" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={isPending} size="sm" className="gap-1.5">
                    <Moon className="w-3.5 h-3.5" />
                    Speichern
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
