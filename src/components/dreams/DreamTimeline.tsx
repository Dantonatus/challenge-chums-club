import { DreamEntry } from '@/lib/dreams/types';
import { DreamCard } from './DreamCard';
import { motion } from 'framer-motion';

interface Props {
  entries: DreamEntry[];
  onSelect: (d: DreamEntry) => void;
}

export function DreamTimeline({ entries, onSelect }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">🌙</p>
        <p className="font-serif text-lg">Noch keine Träume erfasst</p>
        <p className="text-sm mt-1">Erfasse deinen ersten Traum oben</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {entries.map((d, i) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <DreamCard dream={d} onClick={() => onSelect(d)} />
        </motion.div>
      ))}
    </div>
  );
}
