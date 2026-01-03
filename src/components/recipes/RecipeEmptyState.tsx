import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeEmptyStateProps {
  type: 'library' | 'favorites' | 'shopping';
  className?: string;
}

const EMPTY_STATES = {
  library: {
    title: 'No recipes yet',
    description: 'Create your first recipe with AI or add one manually.',
  },
  favorites: {
    title: 'No favorites',
    description: 'Heart a recipe to save it here for quick access.',
  },
  shopping: {
    title: 'Shopping list is empty',
    description: 'Add ingredients from a recipe to start your list.',
  },
};

export function RecipeEmptyState({ type, className }: RecipeEmptyStateProps) {
  const { title, description } = EMPTY_STATES[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <UtensilsCrossed className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
