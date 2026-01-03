import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert chef and certified nutritionist. Generate detailed, realistic recipes with ACCURATE nutrition information.

CRITICAL NUTRITION RULES:
1. Use STANDARD reference values per 100g raw weight:
   - Pasta (dry): ~350 kcal, 12g protein, 72g carbs, 1.5g fat
   - Rice (dry): ~350 kcal, 7g protein, 78g carbs, 0.6g fat
   - Chicken breast (raw): ~110 kcal, 23g protein, 0g carbs, 1.5g fat
   - Beef (lean, raw): ~150 kcal, 22g protein, 0g carbs, 6g fat
   - Salmon (raw): ~180 kcal, 20g protein, 0g carbs, 11g fat
   - Eggs (1 large ~50g): ~72 kcal, 6g protein, 0.4g carbs, 5g fat
   - Olive oil (1 tbsp ~14ml): ~120 kcal, 0g protein, 0g carbs, 14g fat
   - Vegetables (most): ~20-40 kcal per 100g
   - Canned tomatoes: ~20 kcal per 100g
   - Cheese (hard): ~400 kcal per 100g

2. Calculate calories as: (protein × 4) + (carbs × 4) + (fat × 9)
3. The total calories must equal the sum of all ingredient calories
4. Use realistic portion sizes (e.g., 80-100g dry pasta per person)
5. Be conservative with estimates - better to underestimate than overestimate

Always respond with a valid JSON object using this exact structure:
{
  "title": "Recipe Name",
  "short_description": "Brief 1-2 sentence description",
  "servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "cuisine": "Italian",
  "difficulty": "easy|medium|hard",
  "tags": ["vegetarian", "quick", "high-protein"],
  "ingredients": [
    {"name": "chicken breast", "amount": 400, "unit": "g", "calories": 440, "protein": 92, "carbs": 0, "fat": 6, "fiber": 0}
  ],
  "steps": [
    {"step": 1, "instruction": "Preheat oven to 180°C", "time_minutes": 5}
  ],
  "macros": {
    "protein": 92,
    "carbs": 45,
    "fat": 25,
    "fiber": 8
  },
  "micros": {
    "sodium": 800,
    "potassium": 1200,
    "magnesium": 120,
    "iron": 8,
    "calcium": 200,
    "vitaminC": 45
  },
  "calories_total": 773,
  "nutrition_confidence": 0.80
}

Guidelines:
- Use metric units (grams, ml) for consistency
- Double-check your calorie math: sum ingredient calories = calories_total
- Set nutrition_confidence between 0.6 (rough estimate) and 0.90 (verified calculation)
- Include all macros and micros in the response
- Make steps clear and actionable
- Consider the user's goals and constraints when provided`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, goal, allergies, cuisine, time_limit, modification } = await req.json();

    if (!description && !modification) {
      return new Response(
        JSON.stringify({ error: "Description or modification is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userPrompt = "";
    
    if (modification) {
      userPrompt = `Modify this recipe with the following change: "${modification.request}"

Current recipe:
${JSON.stringify(modification.currentRecipe, null, 2)}

Apply the modification and return the complete updated recipe in the same JSON format.`;
    } else {
      userPrompt = `Create a recipe for: "${description}"`;
      
      if (goal) {
        userPrompt += `\n\nDietary goal: ${goal}`;
        if (goal === "muscle_gain") {
          userPrompt += " (prioritize high protein, moderate carbs)";
        } else if (goal === "fat_loss") {
          userPrompt += " (prioritize low calories, high protein, high fiber)";
        }
      }
      
      if (allergies && allergies.length > 0) {
        userPrompt += `\n\nAllergies/restrictions to avoid: ${allergies.join(", ")}`;
      }
      
      if (cuisine) {
        userPrompt += `\n\nPreferred cuisine style: ${cuisine}`;
      }
      
      if (time_limit) {
        userPrompt += `\n\nMaximum total time: ${time_limit} minutes`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let recipe;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      recipe = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse recipe JSON:", content);
      throw new Error("Failed to parse recipe from AI response");
    }

    return new Response(
      JSON.stringify({ recipe }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-recipe error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
