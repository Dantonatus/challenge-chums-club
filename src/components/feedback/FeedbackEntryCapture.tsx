import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CategoryChip } from './CategoryChip';
import { SentimentToggle } from './SentimentToggle';
import { CATEGORIES } from '@/lib/feedback/constants';
import { FeedbackCategory, FeedbackSentiment } from '@/lib/feedback/types';
import { Send } from 'lucide-react';

interface Props {
  employeeId: string;
  onSubmit: (entry: { employee_id: string; content: string; category: string; sentiment: string; entry_date: string }) => void;
  isSubmitting?: boolean;
}

export function FeedbackEntryCapture({ employeeId, onSubmit, isSubmitting }: Props) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('observation');
  const [sentiment, setSentiment] = useState<FeedbackSentiment>('neutral');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ employee_id: employeeId, content: content.trim(), category, sentiment, entry_date: entryDate });
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Feedback erfassen…"
        className="min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map(c => (
            <CategoryChip
              key={c.value}
              value={c.value}
              selected={category === c.value}
              onClick={() => setCategory(c.value)}
              size="md"
            />
          ))}
        </div>
        <SentimentToggle value={sentiment} onChange={setSentiment} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Input
          type="date"
          value={entryDate}
          onChange={e => setEntryDate(e.target.value)}
          className="w-auto text-xs"
        />
        <Button type="submit" size="sm" disabled={!content.trim() || isSubmitting}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Erfassen
        </Button>
      </div>
    </form>
  );
}
