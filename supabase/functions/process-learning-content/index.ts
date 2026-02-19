import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { content, existingTopics } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Content too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing topics for context
    const topicNames = (existingTopics || []).map((t: { name: string }) => t.name);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du bist ein KI-Assistent, der Texte analysiert und strukturiert. Der User kopiert beliebige Texte (Artikel, Notizen, Chat-Nachrichten, etc.) und du extrahierst daraus strukturierte Informationen.

Antworte IMMER mit einem validen JSON-Objekt in exakt diesem Format:
{
  "title": "Kurzer, praegnanter Titel (max 60 Zeichen)",
  "summary": "Quintessenz in 1 knappen Satz – was ist der Kern?",
  "key_points": ["Kernpunkt 1", "Kernpunkt 2", "Kernpunkt 3"],
  "suggested_topic": "Themenvorschlag",
  "tags": ["tag1", "tag2", "tag3"]
}

Regeln:
- Titel: Kurz und praegnant, beschreibt den Inhalt
- Zusammenfassung: Maximal 1 knapper Satz, der die Quintessenz auf den Punkt bringt. Kein Bla-Bla, keine Einleitungen wie "Der Text erlaeutert..." – sondern direkt die Kernaussage.
- Kernpunkte: 3-7 Bullet Points mit den wichtigsten Erkenntnissen
- Topic: Waehle aus den bestehenden Topics wenn passend: [${topicNames.join(", ")}]. Sonst schlage ein neues vor.
- Tags: 2-5 relevante Schlagworte (lowercase)
- Sprache: Antworte in der Sprache des Originaltexts
- Verliere KEINE relevanten Informationen in der Zusammenfassung`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analysiere diesen Text:\n\n${content}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_content",
              description: "Structure the analyzed content into a knowledge nugget",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short descriptive title" },
                  summary: { type: "string", description: "1 concise sentence capturing the quintessence" },
                  key_points: { type: "array", items: { type: "string" }, description: "3-7 key points" },
                  suggested_topic: { type: "string", description: "Topic suggestion" },
                  tags: { type: "array", items: { type: "string" }, description: "2-5 tags" },
                },
                required: ["title", "summary", "key_points", "suggested_topic", "tags"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structure_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Bitte versuche es gleich nochmal." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    let structured;
    if (toolCall?.function?.arguments) {
      structured = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } else {
      // Fallback: try parsing from content
      const rawContent = aiResult.choices?.[0]?.message?.content || "";
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return new Response(JSON.stringify(structured), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-learning-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
