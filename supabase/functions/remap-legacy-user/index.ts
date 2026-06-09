// Admin-only: remap an old (legacy) user_id to a current Cloud auth.users id
// across all tables that hold a user reference. Then optionally apply the
// orphan rows that were on hold for that legacy user.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// (table, column) pairs that hold a user_id
const REMAP_TARGETS: Array<[string, string]> = [
  ["profiles", "id"],
  ["groups", "owner_id"],
  ["group_members", "user_id"],
  ["user_roles", "user_id"],
  ["user_friends", "user_id"],
  ["user_friends", "friend_user_id"],
  ["challenges", "created_by"],
  ["challenge_participants", "user_id"],
  ["challenge_violations", "user_id"],
  ["kpi_measurements", "user_id"],
  ["logs", "user_id"],
  ["payments", "user_id"],
  ["ideas", "created_by"],
  ["idea_comments", "user_id"],
  ["idea_votes", "user_id"],
  ["journal_entries", "user_id"],
  ["saved_views", "user_id"],
  ["scheduled_tips", "user_id"],
  ["approval_tokens", "user_id"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    // Service client for admin checks + writes
    const admin = createClient(url, serviceKey);

    // admin check
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const old_user_id = String(body.old_user_id || "");
    const new_user_id = String(body.new_user_id || "");
    const dry_run = Boolean(body.dry_run);

    if (!UUID_RE.test(old_user_id) || !UUID_RE.test(new_user_id)) {
      return json({ error: "old_user_id and new_user_id must be UUIDs" }, 400);
    }
    if (old_user_id === new_user_id) {
      return json({ error: "old and new are identical" }, 400);
    }

    // Verify new_user_id actually exists in auth.users
    const { data: newAuth, error: newAuthErr } = await admin.auth.admin.getUserById(new_user_id);
    if (newAuthErr || !newAuth?.user) {
      return json({ error: "new_user_id does not exist in auth.users" }, 400);
    }

    const result: Record<string, { updated: number; conflict_skipped: number }> = {};
    for (const [table, col] of REMAP_TARGETS) {
      // Count rows first
      const { count, error: countErr } = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(col, old_user_id);
      if (countErr) {
        result[`${table}.${col}`] = { updated: 0, conflict_skipped: -1 };
        continue;
      }
      if (!count) {
        result[`${table}.${col}`] = { updated: 0, conflict_skipped: 0 };
        continue;
      }
      if (dry_run) {
        result[`${table}.${col}`] = { updated: count, conflict_skipped: 0 };
        continue;
      }
      const { error: updErr, count: updated } = await admin
        .from(table)
        .update({ [col]: new_user_id })
        .eq(col, old_user_id)
        .select("*", { count: "exact", head: true });
      if (updErr) {
        result[`${table}.${col}`] = { updated: 0, conflict_skipped: count };
      } else {
        result[`${table}.${col}`] = { updated: updated ?? 0, conflict_skipped: 0 };
      }
    }

    return json({ ok: true, dry_run, old_user_id, new_user_id, result });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
