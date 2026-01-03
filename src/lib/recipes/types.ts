// Recipe types

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface RecipeStep {
  step: number;
  instruction: string;
  time_minutes?: number;
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Micros {
  sodium: number;
  potassium: number;
  magnesium: number;
  iron: number;
  calcium: number;
  vitaminC: number;
}

export interface Recipe {
  id: string;
  title: string;
  short_description: string | null;
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  cuisine: string | null;
  difficulty: RecipeDifficulty;
  tags_json: string[];
  steps_json: RecipeStep[];
  ingredients_json: Ingredient[];
  calories_total: number | null;
  calories_per_serving: number | null;
  macros_json: Macros;
  micros_json: Micros;
  nutrition_confidence: number;
  source: string;
  user_id: string;
  group_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  is_favorite?: boolean;
}

export interface RecipeFavorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  item_name: string;
  amount: number | null;
  unit: string | null;
  category: string | null;
  checked: boolean;
  recipe_id: string | null;
  created_at: string;
}

// AI generation types
export interface GenerateRecipeInput {
  description: string;
  goal?: 'muscle_gain' | 'fat_loss' | 'maintenance';
  allergies?: string[];
  cuisine?: string;
  time_limit?: number;
}

export interface ModifyRecipeInput {
  currentRecipe: Partial<Recipe>;
  request: string; // e.g., "more protein", "make it vegetarian"
}

export interface GeneratedRecipe {
  title: string;
  short_description: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  cuisine: string;
  difficulty: RecipeDifficulty;
  tags: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  macros: Macros;
  micros: Micros;
  calories_total: number;
  nutrition_confidence: number;
}

// Filter types
export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  tags?: string[];
  maxTime?: number;
  minProtein?: number;
  difficulty?: RecipeDifficulty;
}

// Constants
export const CUISINE_OPTIONS = [
  'Italian',
  'Asian',
  'Mexican',
  'Mediterranean',
  'American',
  'Indian',
  'French',
  'Japanese',
  'Thai',
  'Greek',
];

export const COMMON_TAGS = [
  'quick',
  'high-protein',
  'low-carb',
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'meal-prep',
  'budget-friendly',
  'comfort-food',
];

export const ALLERGY_OPTIONS = [
  'gluten',
  'dairy',
  'nuts',
  'eggs',
  'soy',
  'shellfish',
  'fish',
];

export const GOAL_LABELS = {
  muscle_gain: 'Muscle Gain',
  fat_loss: 'Fat Loss',
  maintenance: 'Maintenance',
};
