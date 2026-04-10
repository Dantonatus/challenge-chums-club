import "https://deno.land/x/xhr@0.1.0/mod.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are a data extraction assistant. You receive images of a TANITA MC-780 body composition report (German language).
Extract ALL the following fields from the report. Return ONLY valid JSON, no markdown, no explanation.

Required JSON structure:
{
  "scan_date": "YYYY-MM-DD",
  "scan_time": "HH:MM:SS",
  "device": "TANITA MC-780",
  "weight_kg": number|null,
  "fat_percent": number|null,
  "fat_mass_kg": number|null,
  "muscle_mass_kg": number|null,
  "bone_mass_kg": number|null,
  "bmi": number|null,
  "metabolic_age": number|null,
  "visceral_fat": number|null,
  "tbw_kg": number|null,
  "tbw_percent": number|null,
  "ecw_kg": number|null,
  "icw_kg": number|null,
  "ecw_tbw_ratio": number|null,
  "bmr_kcal": number|null,
  "age_years": number|null,
  "height_cm": number|null,
  "physique_text": string|null,
  "segments_json": {
    "muscle": {"trunk": number, "armR": number, "armL": number, "legR": number, "legL": number},
    "fat": {"trunk": number, "armR": number, "armL": number, "legR": number, "legL": number}
  } | null
}

Rules:
- Convert German decimal commas to dots (e.g. "95,9" → 95.9)
- Date format: convert "10.04.2026" → "2026-04-10"
- For segments: fat values should be in % (e.g. "20,7 %" → 20.7), muscle values in kg
- visceral_fat and metabolic_age are integers
- If a value is not visible or not present, use null
- Detect device model from the header (e.g. "MC-780" → "TANITA MC-780")
- ECW/TBW ratio is a percentage value`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Build content array with all page images
    const content: any[] = [
      { type: "text", text: "Extract all body composition data from these TANITA report pages:" },
    ];

    for (const imageDataUrl of images) {
      content.push({
        type: "image_url",
        image_url: { url: imageDataUrl },
      });
    }

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content || "";

    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify({ scan: parsed }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("Parse error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
