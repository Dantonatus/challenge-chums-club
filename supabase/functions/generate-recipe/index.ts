import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nutrition data per 100g (from USDA/Open Food Facts standard values)
const NUTRITION_DB: Record<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }> = {
  // Proteins
  "chicken breast": { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  "chicken thigh": { calories: 209, protein: 26, carbs: 0, fat: 11, fiber: 0 },
  "chicken": { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  "beef": { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
  "ground beef": { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
  "beef steak": { calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0 },
  "pork": { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0 },
  "pork chop": { calories: 231, protein: 25, carbs: 0, fat: 14, fiber: 0 },
  "bacon": { calories: 541, protein: 37, carbs: 1.4, fat: 42, fiber: 0 },
  "salmon": { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  "tuna": { calories: 132, protein: 28, carbs: 0, fat: 1, fiber: 0 },
  "shrimp": { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0 },
  "cod": { calories: 82, protein: 18, carbs: 0, fat: 0.7, fiber: 0 },
  "egg": { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 },
  "eggs": { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 },
  "tofu": { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3 },
  "tempeh": { calories: 193, protein: 19, carbs: 9.4, fat: 11, fiber: 0 },
  
  // Dairy
  "milk": { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0 },
  "whole milk": { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
  "cream": { calories: 340, protein: 2.1, carbs: 2.8, fat: 36, fiber: 0 },
  "heavy cream": { calories: 340, protein: 2.1, carbs: 2.8, fat: 36, fiber: 0 },
  "sour cream": { calories: 193, protein: 2.4, carbs: 4.6, fat: 19, fiber: 0 },
  "butter": { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 },
  "cheese": { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0 },
  "cheddar": { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0 },
  "mozzarella": { calories: 280, protein: 28, carbs: 3.1, fat: 17, fiber: 0 },
  "parmesan": { calories: 431, protein: 38, carbs: 4.1, fat: 29, fiber: 0 },
  "feta": { calories: 264, protein: 14, carbs: 4.1, fat: 21, fiber: 0 },
  "cream cheese": { calories: 342, protein: 6, carbs: 4.1, fat: 34, fiber: 0 },
  "yogurt": { calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0 },
  "greek yogurt": { calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0 },
  
  // Grains & Carbs (dry weight)
  "pasta": { calories: 371, protein: 13, carbs: 75, fat: 1.5, fiber: 3 },
  "spaghetti": { calories: 371, protein: 13, carbs: 75, fat: 1.5, fiber: 3 },
  "rice": { calories: 360, protein: 7, carbs: 80, fat: 0.6, fiber: 1.3 },
  "white rice": { calories: 360, protein: 7, carbs: 80, fat: 0.6, fiber: 1.3 },
  "brown rice": { calories: 362, protein: 7.5, carbs: 76, fat: 2.7, fiber: 3.4 },
  "quinoa": { calories: 368, protein: 14, carbs: 64, fat: 6.1, fiber: 7 },
  "oats": { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11 },
  "bread": { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 },
  "flour": { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7 },
  "potato": { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2 },
  "potatoes": { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2 },
  "sweet potato": { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
  "noodles": { calories: 371, protein: 13, carbs: 75, fat: 1.5, fiber: 3 },
  "couscous": { calories: 376, protein: 13, carbs: 77, fat: 0.6, fiber: 5 },
  
  // Vegetables
  "onion": { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 },
  "garlic": { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1 },
  "tomato": { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  "tomatoes": { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  "canned tomatoes": { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  "tomato paste": { calories: 82, protein: 4.3, carbs: 19, fat: 0.5, fiber: 4.1 },
  "tomato sauce": { calories: 29, protein: 1.3, carbs: 6.3, fat: 0.2, fiber: 1.5 },
  "carrot": { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  "carrots": { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  "broccoli": { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  "spinach": { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  "kale": { calories: 49, protein: 4.3, carbs: 9, fat: 0.9, fiber: 3.6 },
  "lettuce": { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
  "cucumber": { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
  "bell pepper": { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  "pepper": { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  "zucchini": { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1 },
  "eggplant": { calories: 25, protein: 1, carbs: 6, fat: 0.2, fiber: 3 },
  "mushroom": { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
  "mushrooms": { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
  "celery": { calories: 14, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6 },
  "cabbage": { calories: 25, protein: 1.3, carbs: 6, fat: 0.1, fiber: 2.5 },
  "cauliflower": { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
  "asparagus": { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1 },
  "green beans": { calories: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4 },
  "peas": { calories: 81, protein: 5.4, carbs: 14, fat: 0.4, fiber: 5.7 },
  "corn": { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2.7 },
  "avocado": { calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 },
  
  // Legumes
  "beans": { calories: 127, protein: 8.7, carbs: 22, fat: 0.5, fiber: 6.4 },
  "black beans": { calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7 },
  "kidney beans": { calories: 127, protein: 8.7, carbs: 22, fat: 0.5, fiber: 6.4 },
  "chickpeas": { calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6 },
  "lentils": { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9 },
  
  // Fruits
  "apple": { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
  "banana": { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
  "orange": { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4 },
  "lemon": { calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8 },
  "lime": { calories: 30, protein: 0.7, carbs: 11, fat: 0.2, fiber: 2.8 },
  "strawberries": { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  "blueberries": { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4 },
  "grapes": { calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9 },
  "mango": { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 },
  "pineapple": { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4 },
  
  // Oils & Fats
  "olive oil": { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  "vegetable oil": { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  "coconut oil": { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  "sesame oil": { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  
  // Nuts & Seeds
  "almonds": { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12 },
  "walnuts": { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7 },
  "peanuts": { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5 },
  "peanut butter": { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6 },
  "cashews": { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3 },
  "sunflower seeds": { calories: 584, protein: 21, carbs: 20, fat: 51, fiber: 8.6 },
  "chia seeds": { calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34 },
  
  // Condiments & Sauces
  "soy sauce": { calories: 53, protein: 8.1, carbs: 4.9, fat: 0.1, fiber: 0.8 },
  "honey": { calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2 },
  "maple syrup": { calories: 260, protein: 0, carbs: 67, fat: 0.1, fiber: 0 },
  "sugar": { calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0 },
  "mayonnaise": { calories: 680, protein: 1, carbs: 0.6, fat: 75, fiber: 0 },
  "ketchup": { calories: 101, protein: 1.3, carbs: 27, fat: 0.1, fiber: 0.3 },
  "mustard": { calories: 66, protein: 4.4, carbs: 6, fat: 4, fiber: 3.3 },
  "vinegar": { calories: 18, protein: 0, carbs: 0.9, fat: 0, fiber: 0 },
  
  // Misc
  "stock": { calories: 7, protein: 1.2, carbs: 0.3, fat: 0.1, fiber: 0 },
  "broth": { calories: 7, protein: 1.2, carbs: 0.3, fat: 0.1, fiber: 0 },
  "chicken stock": { calories: 7, protein: 1.2, carbs: 0.3, fat: 0.1, fiber: 0 },
  "beef broth": { calories: 8, protein: 1.4, carbs: 0.2, fat: 0.2, fiber: 0 },
  "coconut milk": { calories: 197, protein: 2.3, carbs: 2.8, fat: 21, fiber: 0 },
  "wine": { calories: 83, protein: 0.1, carbs: 2.6, fat: 0, fiber: 0 },
  "salt": { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  "pepper spice": { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25 },
  "herbs": { calories: 30, protein: 2, carbs: 5, fat: 0.5, fiber: 3 },
  "ginger": { calories: 80, protein: 1.8, carbs: 18, fat: 0.8, fiber: 2 },
  "basil": { calories: 23, protein: 3.2, carbs: 2.7, fat: 0.6, fiber: 1.6 },
  "parsley": { calories: 36, protein: 3, carbs: 6.3, fat: 0.8, fiber: 3.3 },
  "cilantro": { calories: 23, protein: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8 },
  "thyme": { calories: 101, protein: 5.6, carbs: 24, fat: 1.7, fiber: 14 },
  "rosemary": { calories: 131, protein: 3.3, carbs: 21, fat: 5.9, fiber: 14 },
  "oregano": { calories: 265, protein: 9, carbs: 69, fat: 4.3, fiber: 43 },
  "cumin": { calories: 375, protein: 18, carbs: 44, fat: 22, fiber: 11 },
  "paprika": { calories: 282, protein: 14, carbs: 54, fat: 13, fiber: 35 },
  "turmeric": { calories: 354, protein: 8, carbs: 65, fat: 10, fiber: 21 },
  "cinnamon": { calories: 247, protein: 4, carbs: 81, fat: 1.2, fiber: 53 },
};

// Function to find nutrition data for an ingredient
function findNutritionData(ingredientName: string): { calories: number; protein: number; carbs: number; fat: number; fiber: number } | null {
  const normalizedName = ingredientName.toLowerCase().trim();
  
  // Direct match
  if (NUTRITION_DB[normalizedName]) {
    return NUTRITION_DB[normalizedName];
  }
  
  // Partial match - find if any key is contained in the ingredient name or vice versa
  for (const [key, value] of Object.entries(NUTRITION_DB)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }
  
  // Try removing common modifiers
  const modifiers = ['fresh', 'dried', 'raw', 'cooked', 'chopped', 'diced', 'sliced', 'minced', 'crushed', 'ground', 'whole', 'large', 'small', 'medium', 'organic', 'frozen', 'boneless', 'skinless'];
  let cleanName = normalizedName;
  for (const mod of modifiers) {
    cleanName = cleanName.replace(new RegExp(`\\b${mod}\\b`, 'gi'), '').trim();
  }
  cleanName = cleanName.replace(/\s+/g, ' ').trim();
  
  if (NUTRITION_DB[cleanName]) {
    return NUTRITION_DB[cleanName];
  }
  
  for (const [key, value] of Object.entries(NUTRITION_DB)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return value;
    }
  }
  
  return null;
}

// Convert various units to grams
function convertToGrams(amount: number, unit: string, ingredientName: string): number {
  const unitLower = unit.toLowerCase().trim();
  const nameLower = ingredientName.toLowerCase();
  
  // Already in grams
  if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
    return amount;
  }
  
  // Kilograms
  if (unitLower === 'kg' || unitLower === 'kilogram' || unitLower === 'kilograms') {
    return amount * 1000;
  }
  
  // Milliliters (approximate for liquids)
  if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') {
    if (nameLower.includes('oil')) return amount * 0.92;
    if (nameLower.includes('honey') || nameLower.includes('syrup')) return amount * 1.4;
    return amount;
  }
  
  // Liters
  if (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters') {
    if (nameLower.includes('oil')) return amount * 920;
    return amount * 1000;
  }
  
  // Tablespoons
  if (unitLower === 'tbsp' || unitLower === 'tablespoon' || unitLower === 'tablespoons') {
    if (nameLower.includes('oil') || nameLower.includes('butter')) return amount * 14;
    if (nameLower.includes('honey') || nameLower.includes('syrup')) return amount * 21;
    if (nameLower.includes('flour') || nameLower.includes('sugar')) return amount * 12;
    return amount * 15;
  }
  
  // Teaspoons
  if (unitLower === 'tsp' || unitLower === 'teaspoon' || unitLower === 'teaspoons') {
    if (nameLower.includes('oil')) return amount * 4.5;
    if (nameLower.includes('salt')) return amount * 6;
    return amount * 5;
  }
  
  // Cups
  if (unitLower === 'cup' || unitLower === 'cups') {
    if (nameLower.includes('flour')) return amount * 125;
    if (nameLower.includes('sugar')) return amount * 200;
    if (nameLower.includes('rice') || nameLower.includes('pasta')) return amount * 185;
    if (nameLower.includes('milk') || nameLower.includes('water')) return amount * 240;
    if (nameLower.includes('oil')) return amount * 220;
    if (nameLower.includes('cheese')) return amount * 115;
    if (nameLower.includes('vegetable') || nameLower.includes('spinach') || nameLower.includes('lettuce')) return amount * 30;
    return amount * 150;
  }
  
  // Ounces
  if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') {
    return amount * 28.35;
  }
  
  // Pounds
  if (unitLower === 'lb' || unitLower === 'pound' || unitLower === 'pounds') {
    return amount * 453.6;
  }
  
  // Pieces/items - estimate based on ingredient
  if (unitLower === 'piece' || unitLower === 'pieces' || unitLower === 'item' || unitLower === 'items' || unitLower === '' || unitLower === 'whole') {
    if (nameLower.includes('egg')) return amount * 50;
    if (nameLower.includes('onion')) return amount * 150;
    if (nameLower.includes('garlic') && nameLower.includes('clove')) return amount * 3;
    if (nameLower.includes('garlic')) return amount * 3;
    if (nameLower.includes('tomato')) return amount * 120;
    if (nameLower.includes('potato')) return amount * 150;
    if (nameLower.includes('carrot')) return amount * 60;
    if (nameLower.includes('apple') || nameLower.includes('orange')) return amount * 180;
    if (nameLower.includes('banana')) return amount * 120;
    if (nameLower.includes('lemon') || nameLower.includes('lime')) return amount * 60;
    if (nameLower.includes('chicken breast')) return amount * 175;
    if (nameLower.includes('slice')) return amount * 30;
    return amount * 100;
  }
  
  // Cloves (garlic)
  if (unitLower === 'clove' || unitLower === 'cloves') {
    return amount * 3;
  }
  
  // Bunch
  if (unitLower === 'bunch' || unitLower === 'bunches') {
    if (nameLower.includes('parsley') || nameLower.includes('cilantro') || nameLower.includes('herbs')) return amount * 30;
    if (nameLower.includes('spinach') || nameLower.includes('kale')) return amount * 150;
    return amount * 50;
  }
  
  // Can (standard sizes)
  if (unitLower === 'can' || unitLower === 'cans') {
    if (nameLower.includes('tomato')) return amount * 400;
    if (nameLower.includes('beans') || nameLower.includes('chickpeas')) return amount * 400;
    if (nameLower.includes('coconut milk')) return amount * 400;
    return amount * 400;
  }
  
  // Default: assume grams
  return amount;
}

// Calculate nutrition for a single ingredient
function calculateIngredientNutrition(ingredient: { name: string; amount: number; unit: string }): { calories: number; protein: number; carbs: number; fat: number; fiber: number } | null {
  const nutritionPer100g = findNutritionData(ingredient.name);
  if (!nutritionPer100g) {
    console.log(`No nutrition data found for: ${ingredient.name}`);
    return null;
  }
  
  const grams = convertToGrams(ingredient.amount, ingredient.unit, ingredient.name);
  const factor = grams / 100;
  
  return {
    calories: Math.round(nutritionPer100g.calories * factor),
    protein: Math.round(nutritionPer100g.protein * factor * 10) / 10,
    carbs: Math.round(nutritionPer100g.carbs * factor * 10) / 10,
    fat: Math.round(nutritionPer100g.fat * factor * 10) / 10,
    fiber: Math.round(nutritionPer100g.fiber * factor * 10) / 10,
  };
}

const SYSTEM_PROMPT = `You are an expert chef. Generate detailed, realistic recipes based on user descriptions.

IMPORTANT: You do NOT need to calculate nutrition - it will be calculated separately. Just provide accurate ingredient amounts.

Always respond with a valid JSON object using this exact structure:
{
  "title": "Recipe Title",
  "short_description": "A brief, appetizing description",
  "servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "cuisine": "Italian",
  "difficulty": "easy|medium|hard",
  "tags": ["vegetarian", "quick", "high-protein"],
  "ingredients": [
    {"name": "chicken breast", "amount": 400, "unit": "g"},
    {"name": "olive oil", "amount": 2, "unit": "tbsp"},
    {"name": "garlic", "amount": 3, "unit": "cloves"},
    {"name": "onion", "amount": 1, "unit": "piece"}
  ],
  "steps": [
    {"step": 1, "instruction": "Preheat oven to 180°C", "time_minutes": 5}
  ]
}

Guidelines:
- Use metric units (grams, ml) where possible, but tbsp, tsp, cups, cloves, pieces are also fine
- Provide accurate, realistic amounts
- Make steps clear and actionable
- Consider the user's goals and constraints when provided
- Be specific with ingredient names (e.g., "chicken breast" not just "chicken")`;

Deno.serve(async (req: Request) => {
  console.log("generate-recipe function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.54.0");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));
    
    const { description, goal, allergies, cuisine, time_limit, modification } = body;

    if (!description && !modification) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Either description or modification is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userPrompt = "";
    
    if (modification) {
      userPrompt = `Modify this existing recipe based on the following request: "${modification.request}"

Current recipe:
${JSON.stringify(modification.currentRecipe, null, 2)}

Please provide the complete modified recipe in the same JSON format.`;
    } else {
      userPrompt = `Create a recipe for: ${description}`;
      
      if (goal) {
        const goalDescriptions: Record<string, string> = {
          muscle_gain: "high in protein (aim for 30g+ protein per serving)",
          fat_loss: "low in calories but satisfying (under 500 calories per serving)",
          maintenance: "balanced macros with moderate portions"
        };
        userPrompt += `\nDietary goal: ${goalDescriptions[goal] || goal}`;
      }
      
      if (allergies && allergies.length > 0) {
        userPrompt += `\nAllergies/restrictions (MUST AVOID): ${allergies.join(", ")}`;
      }
      
      if (cuisine) {
        userPrompt += `\nPreferred cuisine: ${cuisine}`;
      }
      
      if (time_limit) {
        userPrompt += `\nTotal time limit: ${time_limit} minutes (prep + cook combined)`;
      }
    }

    console.log("Calling AI API...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few moments." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please check your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");
    
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse AI response
    let recipeData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      // Find the JSON object in the string
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!objectMatch) {
        throw new Error("No JSON object found in response");
      }
      recipeData = JSON.parse(objectMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse recipe JSON:", parseError, content);
      throw new Error("Failed to parse recipe data");
    }

    console.log("Calculating nutrition from database...");
    
    // Calculate nutrition for each ingredient using our database
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let matchedCount = 0;
    
    const ingredientsWithNutrition = recipeData.ingredients.map((ing: { name: string; amount: number; unit: string }) => {
      const nutrition = calculateIngredientNutrition(ing);
      
      if (nutrition) {
        matchedCount++;
        totalCalories += nutrition.calories;
        totalProtein += nutrition.protein;
        totalCarbs += nutrition.carbs;
        totalFat += nutrition.fat;
        totalFiber += nutrition.fiber;
        
        return {
          ...ing,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          fiber: nutrition.fiber,
        };
      }
      
      // Fallback: estimate based on amount (very rough)
      console.log(`Using fallback estimate for: ${ing.name}`);
      return {
        ...ing,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      };
    });

    // Calculate confidence based on how many ingredients we matched
    const confidence = recipeData.ingredients.length > 0 
      ? matchedCount / recipeData.ingredients.length 
      : 0;
    const nutritionConfidence = Math.round(confidence * 100) / 100;
    
    console.log(`Matched ${matchedCount}/${recipeData.ingredients.length} ingredients (${Math.round(confidence * 100)}% confidence)`);
    console.log(`Total nutrition: ${totalCalories} kcal, ${totalProtein}g protein, ${totalCarbs}g carbs, ${totalFat}g fat`);

    // Build final recipe with calculated nutrition
    const recipe = {
      title: recipeData.title,
      short_description: recipeData.short_description,
      servings: recipeData.servings || 4,
      prep_time: recipeData.prep_time,
      cook_time: recipeData.cook_time,
      cuisine: recipeData.cuisine,
      difficulty: recipeData.difficulty || "medium",
      tags: recipeData.tags || [],
      ingredients: ingredientsWithNutrition,
      steps: recipeData.steps,
      macros: {
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        fiber: Math.round(totalFiber * 10) / 10,
      },
      micros: {
        sodium: 0,
        potassium: 0,
        magnesium: 0,
        iron: 0,
        calcium: 0,
        vitaminC: 0,
      },
      calories_total: totalCalories,
      nutrition_confidence: nutritionConfidence,
    };

    console.log("Recipe generated successfully with calculated nutrition");

    return new Response(
      JSON.stringify({ recipe }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-recipe:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate recipe" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
