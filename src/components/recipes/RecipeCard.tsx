import { Clock, Users, Flame, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recipe, Macros } from '@/lib/recipes/types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  isFavorite?: boolean;
  className?: string;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-500/15 text-green-600 dark:text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  hard: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export function RecipeCard({
  recipe,
  onClick,
  onFavoriteClick,
  isFavorite,
  className,
}: RecipeCardProps) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const macros = recipe.macros_json as Macros;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col rounded-2xl border bg-card p-5 text-left transition-all duration-200',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      {/* Favorite button */}
      {onFavoriteClick && (
        <button
          onClick={onFavoriteClick}
          className={cn(
            'absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-all',
            isFavorite
              ? 'bg-red-500/20 text-red-500'
              : 'bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
          )}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
        </button>
      )}

      {/* Title and description */}
      <div className="mb-3 pr-10">
        <h3 className="font-semibold text-foreground line-clamp-1">{recipe.title}</h3>
        {recipe.short_description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {recipe.short_description}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {recipe.cuisine && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {recipe.cuisine}
          </span>
        )}
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', DIFFICULTY_COLORS[recipe.difficulty])}>
          {recipe.difficulty}
        </span>
        {(recipe.tags_json as string[])?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-auto flex items-center gap-4 text-sm text-muted-foreground">
        {totalTime > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {totalTime}min
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {recipe.servings}
        </span>
        {recipe.calories_per_serving && (
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" />
            {Math.round(recipe.calories_per_serving)} kcal
          </span>
        )}
        {macros?.protein && (
          <span className="font-medium text-primary">
            {Math.round(macros.protein / recipe.servings)}g protein
          </span>
        )}
      </div>
    </button>
  );
}
