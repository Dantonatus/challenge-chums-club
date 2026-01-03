import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { NutritionPanel } from '@/components/recipes/NutritionPanel';
import { IngredientList } from '@/components/recipes/IngredientList';
import { StepsList } from '@/components/recipes/StepsList';
import { useCreateRecipe, useModifyRecipe } from '@/hooks/useRecipes';
import type { GeneratedRecipe, Macros, Micros } from '@/lib/recipes/types';

export default function RecipesReview() {
  const location = useLocation();
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const modifyRecipe = useModifyRecipe();

  const [recipe, setRecipe] = useState<GeneratedRecipe>(
    location.state?.recipe || null
  );
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [modifyRequest, setModifyRequest] = useState('');

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">No recipe to review</p>
        <Button variant="link" onClick={() => navigate('/app/recipes/create')}>
          Create a new recipe
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    await createRecipe.mutateAsync(recipe);
    navigate('/app/recipes/library');
  };

  const handleModify = async () => {
    if (!modifyRequest.trim()) return;

    const modified = await modifyRecipe.mutateAsync({
      currentRecipe: recipe,
      request: modifyRequest,
    });

    setRecipe(modified);
    setModifyRequest('');
    setShowModifyDialog(false);
  };

  const QUICK_MODIFICATIONS = [
    'More protein',
    'Fewer calories',
    'Make it vegetarian',
    'Make it dairy-free',
    'Simpler ingredients',
    'Faster to cook',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{recipe.title}</h1>
            <p className="text-muted-foreground">{recipe.short_description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowModifyDialog(true)}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Modify
          </Button>
          <Button onClick={handleSave} disabled={createRecipe.isPending}>
            {createRecipe.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Recipe
          </Button>
        </div>
      </div>

      {/* Recipe info */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>{recipe.servings} servings</span>
        <span>•</span>
        <span>{recipe.prep_time} min prep</span>
        <span>•</span>
        <span>{recipe.cook_time} min cook</span>
        <span>•</span>
        <span className="capitalize">{recipe.difficulty}</span>
        {recipe.cuisine && (
          <>
            <span>•</span>
            <span>{recipe.cuisine}</span>
          </>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {recipe.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <IngredientList
            ingredients={recipe.ingredients}
            servings={recipe.servings}
          />
          <StepsList steps={recipe.steps} />
        </div>
        <div>
          <NutritionPanel
            calories={recipe.calories_total}
            servings={recipe.servings}
            macros={recipe.macros}
            micros={recipe.micros}
            confidence={recipe.nutrition_confidence}
          />
        </div>
      </div>

      {/* Modify dialog */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Recipe</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_MODIFICATIONS.map((mod) => (
                <Button
                  key={mod}
                  variant="outline"
                  size="sm"
                  onClick={() => setModifyRequest(mod)}
                >
                  {mod}
                </Button>
              ))}
            </div>

            <Textarea
              value={modifyRequest}
              onChange={(e) => setModifyRequest(e.target.value)}
              placeholder="Or describe your modification..."
              className="min-h-24"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModifyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleModify}
              disabled={!modifyRequest.trim() || modifyRecipe.isPending}
            >
              {modifyRecipe.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
