import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map old task columns to new schema
function mapTask(oldTask: Record<string, unknown>, newUserId: string): Record<string, unknown> {
  return {
    id: oldTask.id,
    title: oldTask.title,
    description: oldTask.notes || oldTask.description || null, // old 'notes' -> new 'description'
    status: oldTask.status === 'open' ? 'todo' : (oldTask.status === 'in_progress' ? 'in_progress' : oldTask.status as string),
    due_date: oldTask.due_date || null,
    due_time: oldTask.due_time || null,
    priority: oldTask.priority || 'medium',
    effort: oldTask.effort || null,
    project_id: oldTask.project_id || null,
    user_id: newUserId, // Map to new user
    recurrence: oldTask.recurring_frequency && oldTask.recurring_frequency !== 'none' 
      ? oldTask.recurring_frequency as string 
      : (oldTask.recurrence || null),
    reminder_minutes: oldTask.reminder_offset_minutes || oldTask.reminder_minutes || null,
    is_archived: oldTask.status === 'archived',
    is_someday: oldTask.priority === 'p4' && !oldTask.due_date,
    completed_at: oldTask.completed_at || null,
    created_at: oldTask.created_at,
    updated_at: oldTask.updated_at,
    sort_order: oldTask.sort_order || 0,
  };
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

    const { tasks, target_user_id } = await req.json();
    
    if (!tasks || !Array.isArray(tasks) || !target_user_id) {
      return new Response(JSON.stringify({ error: "Missing tasks array or target_user_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let imported = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const task of tasks) {
      const mapped = mapTask(task, target_user_id);
      
      const { error } = await supabaseClient
        .from('tasks')
        .upsert(mapped, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        errors++;
        if (errorMessages.length < 5) {
          errorMessages.push(`${task.title}: ${error.message}`);
        }
        console.error(`Task error: ${task.title} - ${error.message}`);
      } else {
        imported++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      imported, 
      errors,
      total: tasks.length,
      sampleErrors: errorMessages 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Import tasks error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
