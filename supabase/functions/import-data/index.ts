import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Columns that exist in old DB but not in new DB - must be stripped
const STRIP_COLUMNS: Record<string, string[]> = {
  user_roles: ['approved_at', 'approved_by'],
  tasks: ['group_id'],
};

// Column renames: old column name -> new column name
const COLUMN_RENAMES: Record<string, Record<string, string>> = {
  tasks: {
    'notes': 'description',
    'recurring_frequency': 'recurrence',
    'priority': 'priority', // keep as-is but map values below
    'reminder_enabled': '_drop', // doesn't exist in new schema
    'reminder_offset_minutes': 'reminder_minutes',
  },
  task_audit_log: {
    'entity_type': '_drop',
    'entity_id': 'task_id',
    'payload_json': 'new_value',
  },
};

// Enum mappings: old value -> new value
const ENUM_FIXES: Record<string, Record<string, Record<string, string>>> = {
  challenges: {
    duration_type: {
      'continuous': 'custom',
    },
  },
};

function cleanRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  let cleaned = { ...row };

  // Rename columns
  const renames = COLUMN_RENAMES[table];
  if (renames) {
    const renamed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(cleaned)) {
      const newKey = renames[key];
      if (newKey === '_drop') continue; // drop this column
      renamed[newKey || key] = value;
    }
    cleaned = renamed;
  }

  // Strip unknown columns
  const stripCols = STRIP_COLUMNS[table];
  if (stripCols) {
    for (const col of stripCols) {
      delete cleaned[col];
    }
  }

  // Fix enum values
  const enumFixes = ENUM_FIXES[table];
  if (enumFixes) {
    for (const [col, mapping] of Object.entries(enumFixes)) {
      const val = cleaned[col] as string;
      if (val && mapping[val]) {
        cleaned[col] = mapping[val];
      }
    }
  }

  // Tasks: map old priority values (p1-p4) to new ones and fix status
  if (table === 'tasks') {
    // Map old status values
    const statusMap: Record<string, string> = { 'open': 'todo', 'in_progress': 'in_progress' };
    if (cleaned.status && statusMap[cleaned.status as string]) {
      cleaned.status = statusMap[cleaned.status as string];
    }
  }

  return cleaned;
}

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

    // Import order: parent tables first, then dependent tables
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
      'projects',
      'tasks',
      'subtasks',
      'tags',
      'task_tags',
      'recipes',
      'user_friends',
      'payments',
      'saved_views',
      'journal_entries',
      'ideas',
      'idea_comments',
      'idea_votes',
      'ingredient_matches',
      'recipe_favorites',
      'shopping_list_items',
      'task_preferences',
      'task_audit_log',
      'scheduled_tips',
      'approval_tokens',
    ];

    for (const table of importOrder) {
      const rows = data[table];
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        results[table] = 'skipped (no data)';
        continue;
      }

      try {
        // Clean each row
        const cleanedRows = rows.map(row => cleanRow(table, row));

        // Insert in batches of 50 to avoid payload limits
        let imported = 0;
        for (let i = 0; i < cleanedRows.length; i += 50) {
          const batch = cleanedRows.slice(i, i + 50);
          const { error } = await supabaseClient
            .from(table)
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

          if (error) {
            // If batch fails, try one by one
            console.error(`Batch error for ${table}:`, error.message);
            for (const row of batch) {
              const { error: rowError } = await supabaseClient
                .from(table)
                .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
              if (!rowError) {
                imported++;
              } else {
                console.error(`Row error for ${table}:`, rowError.message);
              }
            }
          } else {
            imported += batch.length;
          }
        }

        results[table] = `imported ${imported}/${cleanedRows.length} rows`;
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
