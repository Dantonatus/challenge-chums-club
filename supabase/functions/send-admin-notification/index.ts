import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  userId: string;
  userEmail: string;
  userName?: string;
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

    const { userId, userEmail, userName }: AdminNotificationRequest = await req.json();

    if (!userId || !userEmail) {
      throw new Error("Missing required fields: userId and userEmail are required");
    }

    // Generate secure approval token
    const approvalToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store the approval token
    const { error: tokenError } = await supabaseClient
      .from('approval_tokens')
      .insert({
        token: approvalToken,
        user_id: userId,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error("Error creating approval token:", tokenError);
      throw new Error(`Failed to create approval token: ${tokenError.message}`);
    }

    console.log(`New user registration: ${userEmail} (${userName || 'N/A'}). Approval token created.`);
    console.log(`Admin should check the Approval page in the app to approve this user.`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "User registration recorded. Admin can approve via the app.",
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
