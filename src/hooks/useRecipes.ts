import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Recipe, 
  RecipeFilters, 
  GenerateRecipeInput, 
  ModifyRecipeInput,
  GeneratedRecipe,
  Ingredient,
  RecipeStep,
  Macros,
  Micros
} from '@/lib/recipes/types';

const RECIPES_KEY = ['recipes'];

// Fetch all recipes with optional filters
export function useRecipes(filters?: RecipeFilters) {
  return useQuery({
    queryKey: [...RECIPES_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.cuisine) {
        query = query.eq('cuisine', filters.cuisine);
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.maxTime) {
        query = query.lte('cook_time', filters.maxTime);
      }

      const { data, error } = await query;
      if (error) throw error;

      let recipes = (data || []) as unknown as Recipe[];

      // Client-side filtering for complex queries
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        recipes = recipes.filter(r =>
          r.title.toLowerCase().includes(searchLower) ||
          r.short_description?.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.tags && filters.tags.length > 0) {
        recipes = recipes.filter(r =>
          filters.tags!.some(tag => 
            (r.tags_json as string[])?.includes(tag)
          )
        );
      }

      if (filters?.minProtein) {
        recipes = recipes.filter(r =>
          (r.macros_json as Macros)?.protein >= filters.minProtein!
        );
      }

      return recipes;
    },
  });
}

// Fetch single recipe
export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: [...RECIPES_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Recipe;
    },
  });
}

// Fetch favorite recipes
export function useFavoriteRecipes() {
  return useQuery({
    queryKey: [...RECIPES_KEY, 'favorites'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data: favorites, error: favError } = await supabase
        .from('recipe_favorites')
        .select('recipe_id')
        .eq('user_id', user.user.id);

      if (favError) throw favError;
      if (!favorites?.length) return [];

      const recipeIds = favorites.map(f => f.recipe_id);
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

      if (error) throw error;
      return (recipes || []).map(r => ({ ...r, is_favorite: true })) as unknown as Recipe[];
    },
  });
}

// Create recipe
export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipe: GeneratedRecipe) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          title: recipe.title,
          short_description: recipe.short_description,
          servings: recipe.servings,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          cuisine: recipe.cuisine,
          difficulty: recipe.difficulty,
          tags_json: recipe.tags as any,
          steps_json: recipe.steps as any,
          ingredients_json: recipe.ingredients as any,
          calories_total: recipe.calories_total,
          calories_per_serving: Math.round(recipe.calories_total / recipe.servings),
          macros_json: recipe.macros,
          micros_json: recipe.micros,
          nutrition_confidence: recipe.nutrition_confidence,
          source: 'ai',
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY });
      toast.success('Recipe saved to your library');
    },
    onError: (error) => {
      toast.error('Failed to save recipe: ' + error.message);
    },
  });
}

// Update recipe
export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Recipe> & { id: string }) => {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY });
      toast.success('Recipe updated');
    },
    onError: (error) => {
      toast.error('Failed to update recipe: ' + error.message);
    },
  });
}

// Delete recipe
export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY });
      toast.success('Recipe deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete recipe: ' + error.message);
    },
  });
}

// Toggle favorite
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      if (isFavorite) {
        const { error } = await supabase
          .from('recipe_favorites')
          .delete()
          .eq('user_id', user.user.id)
          .eq('recipe_id', recipeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recipe_favorites')
          .insert({ user_id: user.user.id, recipe_id: recipeId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY });
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    },
    onError: (error) => {
      toast.error('Failed to update favorites: ' + error.message);
    },
  });
}

// Generate recipe with AI
export function useGenerateRecipe() {
  return useMutation({
    mutationFn: async (input: GenerateRecipeInput): Promise<GeneratedRecipe> => {
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: input,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.recipe as GeneratedRecipe;
    },
    onError: (error) => {
      toast.error('Failed to generate recipe: ' + error.message);
    },
  });
}

// Modify recipe with AI
export function useModifyRecipe() {
  return useMutation({
    mutationFn: async (input: ModifyRecipeInput): Promise<GeneratedRecipe> => {
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: { modification: input },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.recipe as GeneratedRecipe;
    },
    onError: (error) => {
      toast.error('Failed to modify recipe: ' + error.message);
    },
  });
}
