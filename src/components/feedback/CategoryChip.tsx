import { CATEGORIES } from '@/lib/feedback/constants';
import { FeedbackCategory } from '@/lib/feedback/types';
import { cn } from '@/lib/utils';

interface Props {
  value: FeedbackCategory;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function CategoryChip({ value, selected, onClick, size = 'sm' }: Props) {
  const cat = CATEGORIES.find(c => c.value === value);
  if (!cat) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        cat.color,
        onClick && 'cursor-pointer hover:opacity-80',
        selected === false && 'opacity-40',
      )}
    >
      {cat.label}
    </button>
  );
}
