import { SENTIMENTS } from '@/lib/feedback/constants';
import { FeedbackSentiment } from '@/lib/feedback/types';
import { cn } from '@/lib/utils';

interface Props {
  value: FeedbackSentiment;
  onChange: (v: FeedbackSentiment) => void;
}

export function SentimentToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 p-0.5">
      {SENTIMENTS.map(s => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(s.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            value === s.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', s.dotColor)} />
          {s.label}
        </button>
      ))}
    </div>
  );
}
