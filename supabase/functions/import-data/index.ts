import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data = await req.json();
    const results: Record<string, string> = {};

    // Import order matters due to foreign keys
    const importOrder = [
      'profiles',
      'groups', 
      'group_members',
      'user_roles',
      'challenges',
      'challenge_participants',
      'challenge_violations',
      'logs',
      'kpi_definitions',
      'kpi_measurements',
      'clients',
      'planning_projects',
      'milestones',
      'tasks',
      'subtasks',
      'projects',
      'tags',
      'task_tags',
      'recipes',
      'user_friends',
      'payments',
      'saved_views',
    ];

    for (const table of importOrder) {
      const rows = data[table];
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        results[table] = 'skipped (no data)';
        continue;
      }

      // For profiles, we need to handle the id mapping to new user
      // Skip importing profiles for now as user IDs won't match
      
      try {
        const { error } = await supabaseClient
          .from(table)
          .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

        if (error) {
          results[table] = `error: ${error.message}`;
          console.error(`Error importing ${table}:`, error);
        } else {
          results[table] = `imported ${rows.length} rows`;
        }
      } catch (e) {
        results[table] = `error: ${e.message}`;
        console.error(`Error importing ${table}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
