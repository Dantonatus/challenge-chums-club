import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Ingredient } from '@/lib/recipes/types';

interface IngredientListProps {
  ingredients: Ingredient[];
  servings: number;
  scaleFactor?: number;
  onAddToShoppingList?: () => void;
  className?: string;
}

export function IngredientList({
  ingredients,
  servings,
  scaleFactor = 1,
  onAddToShoppingList,
  className,
}: IngredientListProps) {
  return (
    <div className={cn('rounded-2xl border bg-card p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">
          Ingredients
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({Math.round(servings * scaleFactor)} servings)
          </span>
        </h3>
        {onAddToShoppingList && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddToShoppingList}
            className="gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to list
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {ingredients.map((ingredient, index) => (
          <li
            key={index}
            className="flex items-center justify-between rounded-lg py-2 text-sm"
          >
            <span className="text-foreground">{ingredient.name}</span>
            <span className="font-medium text-muted-foreground">
              {Math.round(ingredient.amount * scaleFactor)} {ingredient.unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
