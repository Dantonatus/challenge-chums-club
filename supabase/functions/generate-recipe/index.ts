import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert chef and nutritionist. Generate detailed, realistic recipes based on user descriptions.

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
    {"name": "chicken breast", "amount": 500, "unit": "g", "calories": 550, "protein": 115, "carbs": 0, "fat": 6, "fiber": 0}
  ],
  "steps": [
    {"step": 1, "instruction": "Preheat oven to 180°C", "time_minutes": 5}
  ],
  "macros": {
    "protein": 115,
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
  "calories_total": 850,
  "nutrition_confidence": 0.75
}

Guidelines:
- Use metric units (grams, ml) for consistency
- Provide realistic nutrition estimates based on typical ingredient values
- Set nutrition_confidence between 0.5 (rough estimate) and 0.95 (very confident)
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
