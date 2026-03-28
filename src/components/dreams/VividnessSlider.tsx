import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}

export function VividnessSlider({ value, onChange, label = 'Lebendigkeit' }: Props) {
  const dots = [1, 2, 3, 4, 5];
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-2 items-center">
        {dots.map((d) => (
          <motion.button
            key={d}
            type="button"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(d)}
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-all',
              d <= value
                ? 'bg-primary border-primary'
                : 'bg-muted/30 border-border/50'
            )}
            style={{
              boxShadow: d <= value ? `0 0 ${4 + value * 3}px hsl(var(--primary) / ${0.2 + value * 0.1})` : 'none',
            }}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{value}/5</span>
      </div>
    </div>
  );
}
