import { MOODS, MoodValue } from '@/lib/dreams/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  value: MoodValue | null;
  onChange: (v: MoodValue) => void;
}

export function MoodSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {MOODS.map((m) => (
        <motion.button
          key={m.value}
          type="button"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(m.value)}
          className={cn(
            'text-2xl p-2 rounded-xl transition-all border-2',
            value === m.value
              ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20'
              : 'border-transparent hover:bg-muted/50'
          )}
          title={m.label}
        >
          {m.emoji}
        </motion.button>
      ))}
    </div>
  );
}
