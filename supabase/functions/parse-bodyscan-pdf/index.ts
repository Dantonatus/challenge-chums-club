import "https://deno.land/x/xhr@0.1.0/mod.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  "skeletal_muscle_mass_kg": number|null,
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
- For fat segments: values should be in % (e.g. "20,7 %" → 20.7)
- For muscle segments: values should be in kg. Look for the "Segmentanalyse Muskel" page/table with kg values per body part: Rumpf=trunk, Arm R=armR, Arm L=armL, Bein R=legR, Bein L=legL
- skeletal_muscle_mass_kg: Look for "Skelettmuskulatur" or "Skeletal Muscle Mass" in kg — this is different from total muscle mass
- Look for "Grundumsatz" or "BMR" value in kcal — this is critical, do not skip it
- visceral_fat and metabolic_age are integers
- ECW/TBW ratio is a percentage value
- If a value is not visible or not present, use null
- Detect device model from the header (e.g. "MC-780" → "TANITA MC-780")`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content: any[] = [
      { type: "text", text: "Extract all body composition data from these TANITA report pages. Pay special attention to muscle segment values (in kg) and BMR (Grundumsatz in kcal):" },
    ];

    for (const imageDataUrl of images) {
      content.push({
        type: "image_url",
        image_url: { url: imageDataUrl },
      });
    }

    const response = await fetch(AI_GATEWAY_URL, {
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
      console.error("AI API error:", response.status, errText);
      return new Response(JSON.stringify({ error: errText || "AI processing failed" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const messageContent = result.choices?.[0]?.message?.content;
    const rawContent = Array.isArray(messageContent)
      ? messageContent.map((part: { text?: string }) => part?.text ?? "").join("\n")
      : messageContent || "";

    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify({ scan: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
