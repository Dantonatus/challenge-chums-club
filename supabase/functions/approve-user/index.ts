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
    console.log("User approval function called");
    
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let userId: string;
    let userEmail: string;

    if (token) {
      // Token-based approval
      console.log("Processing token-based approval");
      
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('approval_tokens')
        .select('user_id, expires_at, used_at')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        return new Response("Invalid or expired approval token", { status: 401 });
      }

      if (tokenData.used_at) {
        return new Response("Token has already been used", { status: 401 });
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return new Response("Token has expired", { status: 401 });
      }

      userId = tokenData.user_id;

      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
      if (userError || !userData.user) {
        return new Response("User not found", { status: 404 });
      }
      userEmail = userData.user.email || "Unknown";

    } else {
      // Direct approval (admin interface)
      console.log("Processing direct admin approval");
      
      if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const body = await req.json();
      userId = body.userId;
      userEmail = body.userEmail;

      if (!userId || !userEmail) {
        return new Response("Missing userId or userEmail", { status: 400 });
      }
    }

    console.log("Approving user:", userId);

    // Confirm user's email
    const { error: confirmError } = await supabaseClient.auth.admin.updateUserById(userId, {
      email_confirm: true
    });

    if (confirmError) {
      console.error("Error confirming user email:", confirmError);
    } else {
      console.log("User email confirmed:", userId);
    }

    // Approve the user
    const { data, error } = await supabaseClient.rpc('approve_user', {
      target_user_id: userId
    });

    if (error) {
      console.error("Error approving user:", error);
      return new Response(JSON.stringify({ 
        error: `Error approving user: ${error.message}` 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mark token as used
    if (token) {
      await supabaseClient
        .from('approval_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);
    }

    console.log("User approved successfully:", userId, userEmail);

    // Return appropriate response
    if (token) {
      const successPage = `
        <!DOCTYPE html>
        <html>
        <head><title>User Approved</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; }
          .success h2 { color: #155724; margin-top: 0; }
          .success p { color: #155724; }
        </style>
        </head>
        <body>
          <div class="success">
            <h2>✅ User Approved Successfully!</h2>
            <p><strong>User Email:</strong> ${userEmail}</p>
            <p>The user can now log in and access the platform.</p>
          </div>
        </body>
        </html>
      `;
      return new Response(successPage, {
        status: 200,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User approved successfully",
        userEmail 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (error: any) {
    console.error("Error in approve-user function:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "An error occurred during approval",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
