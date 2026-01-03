-- Create difficulty enum
CREATE TYPE recipe_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  short_description TEXT,
  servings INTEGER NOT NULL DEFAULT 4,
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  cuisine TEXT,
  difficulty recipe_difficulty DEFAULT 'medium',
  tags_json JSONB DEFAULT '[]'::jsonb,
  steps_json JSONB DEFAULT '[]'::jsonb,
  ingredients_json JSONB DEFAULT '[]'::jsonb,
  calories_total NUMERIC,
  calories_per_serving NUMERIC,
  macros_json JSONB DEFAULT '{}'::jsonb, -- {protein, carbs, fat, fiber}
  micros_json JSONB DEFAULT '{}'::jsonb, -- {sodium, potassium, magnesium, iron, calcium, vitaminC}
  nutrition_confidence NUMERIC DEFAULT 0.7, -- 0-1 scale
  source TEXT DEFAULT 'ai', -- 'ai' | 'manual' | 'imported'
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Favorites table
CREATE TABLE public.recipe_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Shopping list items
CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  amount NUMERIC,
  unit TEXT,
  category TEXT,
  checked BOOLEAN DEFAULT false,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ingredient matches for nutrition tracking
CREATE TABLE public.ingredient_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_text TEXT NOT NULL,
  matched_food_name TEXT,
  match_score NUMERIC DEFAULT 0.8, -- confidence
  grams NUMERIC,
  nutrients_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_matches ENABLE ROW LEVEL SECURITY;

-- Recipes RLS policies
CREATE POLICY "Users can view own recipes" ON public.recipes
  FOR SELECT USING (
    user_id = auth.uid() 
    OR is_public = true 
    OR (group_id IS NOT NULL AND is_group_member(group_id))
  );

CREATE POLICY "Users can create own recipes" ON public.recipes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recipes" ON public.recipes
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own recipes" ON public.recipes
  FOR DELETE USING (user_id = auth.uid());

-- Favorites RLS policies
CREATE POLICY "Users can view own favorites" ON public.recipe_favorites
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own favorites" ON public.recipe_favorites
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own favorites" ON public.recipe_favorites
  FOR DELETE USING (user_id = auth.uid());

-- Shopping list RLS policies
CREATE POLICY "Users can manage own shopping list" ON public.shopping_list_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Ingredient matches RLS policies
CREATE POLICY "Users can view ingredient matches" ON public.ingredient_matches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND (r.user_id = auth.uid() OR (r.group_id IS NOT NULL AND is_group_member(r.group_id))))
  );

CREATE POLICY "Users can manage ingredient matches" ON public.ingredient_matches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX idx_recipes_cuisine ON public.recipes(cuisine);
CREATE INDEX idx_recipes_tags ON public.recipes USING GIN(tags_json);
CREATE INDEX idx_recipe_favorites_user_id ON public.recipe_favorites(user_id);
CREATE INDEX idx_shopping_list_user_id ON public.shopping_list_items(user_id);

-- Updated at trigger
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();