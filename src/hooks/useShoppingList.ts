import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ShoppingListItem, Ingredient } from '@/lib/recipes/types';

const SHOPPING_LIST_KEY = ['shopping-list'];

// Fetch shopping list
export function useShoppingList() {
  return useQuery({
    queryKey: SHOPPING_LIST_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .order('category', { ascending: true })
        .order('checked', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ShoppingListItem[];
    },
  });
}

// Add item to shopping list
export function useAddToShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: { item_name: string; amount?: number; unit?: string; category?: string; recipe_id?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shopping_list_items')
        .insert({
          ...item,
          user_id: user.user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ShoppingListItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
    onError: (error) => {
      toast.error('Failed to add item: ' + error.message);
    },
  });
}

// Add multiple ingredients from a recipe
export function useAddIngredientsToShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ingredients, recipeId }: { ingredients: Ingredient[]; recipeId?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const items = ingredients.map(ing => ({
        user_id: user.user!.id,
        item_name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        category: categorizeIngredient(ing.name),
        recipe_id: recipeId,
      }));

      const { error } = await supabase
        .from('shopping_list_items')
        .insert(items as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
      toast.success('Ingredients added to shopping list');
    },
    onError: (error) => {
      toast.error('Failed to add ingredients: ' + error.message);
    },
  });
}

// Toggle item checked
export function useToggleShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ checked })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

// Delete item
export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

// Clear checked items
export function useClearCheckedItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('user_id', user.user.id)
        .eq('checked', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
      toast.success('Checked items cleared');
    },
  });
}

// Helper to categorize ingredients
function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();
  
  if (/chicken|beef|pork|fish|salmon|shrimp|tofu|egg/.test(lower)) return 'Protein';
  if (/milk|cheese|yogurt|butter|cream/.test(lower)) return 'Dairy';
  if (/apple|banana|orange|lemon|lime|berry|fruit/.test(lower)) return 'Produce';
  if (/onion|garlic|tomato|pepper|lettuce|spinach|vegetable/.test(lower)) return 'Produce';
  if (/rice|pasta|bread|flour|oat/.test(lower)) return 'Grains';
  if (/oil|olive|vinegar|sauce|soy/.test(lower)) return 'Pantry';
  if (/salt|pepper|spice|herb|basil|oregano/.test(lower)) return 'Spices';
  
  return 'Other';
}
