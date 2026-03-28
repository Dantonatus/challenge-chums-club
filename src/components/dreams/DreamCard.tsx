import { DreamEntry, MOODS, EMOTIONS } from '@/lib/dreams/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sparkles, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  dream: DreamEntry;
  onClick: () => void;
}

export function DreamCard({ dream, onClick }: Props) {
  const moodObj = MOODS.find(m => m.value === dream.mood);
  const vivGlow = (dream.vividness ?? 3) * 3;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <Card
        onClick={onClick}
        className="cursor-pointer relative overflow-hidden backdrop-blur-sm bg-card/70 border-border/40 hover:border-primary/40 transition-all"
        style={{
          boxShadow: `0 0 ${vivGlow}px hsl(var(--primary) / ${0.05 + (dream.vividness ?? 0) * 0.04})`,
        }}
      >
        {moodObj && (
          <div className={`absolute inset-0 bg-gradient-to-br ${moodObj.gradient} opacity-10 pointer-events-none`} />
        )}
        <CardContent className="pt-4 pb-3 px-4 space-y-2 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{moodObj?.emoji ?? '🌙'}</span>
              {dream.is_lucid && <Sparkles className="w-3 h-3 text-amber-400" />}
              {dream.is_recurring && <RotateCcw className="w-3 h-3 text-blue-400" />}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(dream.entry_date), { addSuffix: true, locale: de })}
            </span>
          </div>
          <h4 className="font-serif text-sm font-medium leading-tight line-clamp-2">{dream.title}</h4>
          {dream.content && (
            <p className="text-xs text-muted-foreground line-clamp-2">{dream.content}</p>
          )}
          {dream.tags && dream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dream.tags.slice(0, 3).map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{t}</span>
              ))}
              {dream.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{dream.tags.length - 3}</span>}
            </div>
          )}
          {/* Vividness bar */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(d => (
              <div key={d} className={cn('h-1 flex-1 rounded-full', d <= (dream.vividness ?? 0) ? 'bg-primary' : 'bg-muted/30')} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
