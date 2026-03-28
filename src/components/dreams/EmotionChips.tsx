import { EMOTIONS, EmotionValue } from '@/lib/dreams/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  value: EmotionValue[];
  onChange: (v: EmotionValue[]) => void;
}

export function EmotionChips({ value, onChange }: Props) {
  const toggle = (e: EmotionValue) => {
    onChange(value.includes(e) ? value.filter(x => x !== e) : [...value, e]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {EMOTIONS.map((e) => (
        <motion.button
          key={e.value}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toggle(e.value)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium border transition-all',
            value.includes(e.value)
              ? e.color
              : 'bg-muted/30 text-muted-foreground border-border/50 opacity-60'
          )}
        >
          {e.label}
        </motion.button>
      ))}
    </div>
  );
}
