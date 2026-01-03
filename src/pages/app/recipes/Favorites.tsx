import { useNavigate } from 'react-router-dom';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeEmptyState } from '@/components/recipes/RecipeEmptyState';
import { useFavoriteRecipes, useToggleFavorite } from '@/hooks/useRecipes';
import { Skeleton } from '@/components/ui/skeleton';

export default function RecipesFavorites() {
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useFavoriteRecipes();
  const toggleFavorite = useToggleFavorite();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Favorites</h1>
        <p className="text-muted-foreground">
          Your saved recipes for quick access
        </p>
      </div>

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : !recipes?.length ? (
        <RecipeEmptyState type="favorites" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => navigate(`/app/recipes/${recipe.id}`)}
              onFavoriteClick={(e) => {
                e.stopPropagation();
                toggleFavorite.mutate({ recipeId: recipe.id, isFavorite: true });
              }}
              isFavorite
            />
          ))}
        </div>
      )}
    </div>
  );
}
