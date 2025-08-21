import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@4.0.0";

// Resend is initialized lazily inside the handler to avoid crashing on missing secrets

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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

    // Check if this is a token-based approval (email link) or direct approval (admin interface)
    if (token) {
      // Token-based approval (email link)
      console.log("Processing token-based approval");
      
      // Verify and consume the approval token
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('approval_tokens')
        .select('user_id, expires_at, used_at')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        console.error("Invalid or expired token:", tokenError);
        return new Response("Invalid or expired approval token", { status: 401 });
      }

      if (tokenData.used_at) {
        return new Response("Token has already been used", { status: 401 });
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return new Response("Token has expired", { status: 401 });
      }

      userId = tokenData.user_id;

      // Get user email
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
      if (userError || !userData.user) {
        console.error("Error fetching user:", userError);
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

    // Approve the user by calling the approve_user function
    const { data, error } = await supabaseClient.rpc('approve_user', {
      target_user_id: userId
    });

    if (error) {
      console.error("Error approving user:", error);
      return new Response(JSON.stringify({ 
        error: `Error approving user: ${error.message}` 
      }), { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Mark the token as used (only if token-based approval)
    if (token) {
      await supabaseClient
        .from('approval_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);
    }

    console.log("User approved successfully:", userId);

    // Send confirmation email to the user
    console.log("Sending confirmation email to:", userEmail);
    if (userEmail && userEmail !== "Unknown") {
      const confirmationEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
            🎉 Welcome! Your Account Has Been Approved
          </h2>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">Great News!</h3>
            <p style="color: #155724;">
              Your account has been approved by the administrator. You can now access all features of the Challenge Management System.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SUPABASE_URL").replace('/rest/v1', '')}" 
               style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              🚀 ACCESS PLATFORM
            </a>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #495057; margin-top: 0;">What's Next?</h4>
            <ul style="color: #495057;">
              <li>Log in to your account</li>
              <li>Join or create challenges</li>
              <li>Track your progress</li>
              <li>Connect with other members</li>
            </ul>
          </div>

          <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; color: #6c757d; font-size: 12px;">
            <p>Welcome to the community! If you have any questions, feel free to reach out to the administrator.</p>
          </div>
        </div>
      `;

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: "Challenge System <noreply@resend.dev>",
            to: [userEmail],
            subject: "🎉 Account Approved - Welcome to Challenge Management System!",
            html: confirmationEmailContent,
          });
          console.log("Confirmation email sent to user:", userEmail);
        } catch (emailError) {
          console.error("Error sending confirmation email:", emailError);
        }
      } else {
        console.warn("RESEND_API_KEY not set; skipping confirmation email");
      }
    }

    // Return appropriate response based on approval type
    if (token) {
      // Token-based approval: return HTML page
      const successPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Approved Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; }
            .success h2 { color: #155724; margin-top: 0; }
            .success p { color: #155724; }
            .button { background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>✅ User Approved Successfully!</h2>
            <p><strong>User Email:</strong> ${userEmail}</p>
            <p>The user has been approved and can now access the platform. A confirmation email has been sent to them.</p>
            <a href="mailto:${Deno.env.get('ADMIN_EMAIL') ?? ''}" class="button">Contact Admin</a>
          </div>
        </body>
        </html>
      `;

      return new Response(successPage, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          ...corsHeaders,
        },
      });
    } else {
      // Direct approval: return JSON response
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User approved successfully",
        userEmail 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
  } catch (error: any) {
    console.error("Error in approve-user function:", error);
    
    // Return appropriate error response
    return new Response(JSON.stringify({ 
      error: error.message || "An error occurred during approval",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
};

serve(handler);