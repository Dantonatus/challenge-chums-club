import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  ChefHat, 
  Clock, 
  Users, 
  Share2,
  Trash2,
  Minus,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { NutritionPanel } from '@/components/recipes/NutritionPanel';
import { IngredientList } from '@/components/recipes/IngredientList';
import { StepsList } from '@/components/recipes/StepsList';
import { useRecipe, useDeleteRecipe, useToggleFavorite } from '@/hooks/useRecipes';
import { useAddIngredientsToShoppingList } from '@/hooks/useShoppingList';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Macros, Micros, Ingredient, RecipeStep } from '@/lib/recipes/types';

export default function RecipeDetail() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  
  const { data: recipe, isLoading } = useRecipe(recipeId);
  const deleteRecipe = useDeleteRecipe();
  const toggleFavorite = useToggleFavorite();
  const addToShoppingList = useAddIngredientsToShoppingList();

  const [cookMode, setCookMode] = useState(false);
  const [servingScale, setServingScale] = useState(1);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Recipe not found</p>
        <Button variant="link" onClick={() => navigate('/app/recipes/library')}>
          Back to library
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteRecipe.mutateAsync(recipe.id);
    navigate('/app/recipes/library');
  };

  const handleAddToShoppingList = () => {
    const scaledIngredients = (recipe.ingredients_json as Ingredient[]).map(ing => ({
      ...ing,
      amount: ing.amount * servingScale,
    }));
    addToShoppingList.mutate({ ingredients: scaledIngredients, recipeId: recipe.id });
  };

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const scaledServings = recipe.servings * servingScale;

  if (cookMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCookMode(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Cook Mode
          </Button>
          <h1 className="text-xl font-bold">{recipe.title}</h1>
        </div>
        <StepsList steps={recipe.steps_json as RecipeStep[]} cookMode />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/recipes/library')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{recipe.title}</h1>
            <p className="text-muted-foreground">{recipe.short_description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite.mutate({ 
              recipeId: recipe.id, 
              isFavorite: !!recipe.is_favorite 
            })}
            className={cn(recipe.is_favorite && 'text-red-500')}
          >
            <Heart className={cn('h-5 w-5', recipe.is_favorite && 'fill-current')} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete recipe?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{recipe.title}" from your library.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          {totalTime} min
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4" />
          {recipe.servings} servings
        </span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
          {recipe.difficulty}
        </span>
        {recipe.cuisine && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
            {recipe.cuisine}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setCookMode(true)}>
          <ChefHat className="mr-2 h-4 w-4" />
          Start Cooking
        </Button>

        {/* Serving scale */}
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setServingScale(Math.max(0.5, servingScale - 0.5))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-16 text-center text-sm font-medium">
            {scaledServings} servings
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setServingScale(servingScale + 0.5)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <IngredientList
            ingredients={recipe.ingredients_json as Ingredient[]}
            servings={recipe.servings}
            scaleFactor={servingScale}
            onAddToShoppingList={handleAddToShoppingList}
          />
          <StepsList steps={recipe.steps_json as RecipeStep[]} />
        </div>
        <div>
          <NutritionPanel
            calories={recipe.calories_total || 0}
            servings={recipe.servings}
            macros={recipe.macros_json as Macros}
            micros={recipe.micros_json as Micros}
            confidence={recipe.nutrition_confidence}
          />
        </div>
      </div>
    </div>
  );
}
