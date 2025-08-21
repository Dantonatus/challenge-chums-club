import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    if (!token) {
      return new Response("Missing approval token", { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    const userId = tokenData.user_id;
    console.log("Approving user:", userId);


    // Get user details first
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      console.error("Error fetching user:", userError);
      return new Response("User not found", { status: 404 });
    }

    // Approve the user by calling the approve_user function
    const { data, error } = await supabaseClient.rpc('approve_user', {
      target_user_id: userId
    });

    if (error) {
      console.error("Error approving user:", error);
      return new Response(`Error approving user: ${error.message}`, { status: 500 });
    }

    // Mark the token as used
    await supabaseClient
      .from('approval_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    console.log("User approved successfully:", userId);

    // Send confirmation email to the user
    const userEmail = userData.user.email;
    if (userEmail) {
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

      try {
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
    }

    // Return success page
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
          <a href="mailto:danielantonatus@live.de" class="button">Contact Admin</a>
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
  } catch (error: any) {
    console.error("Error in approve-user function:", error);
    const errorPage = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Approval Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; }
          .error h2 { color: #721c24; margin-top: 0; }
          .error p { color: #721c24; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Approval Error</h2>
          <p>There was an error approving the user: ${error.message}</p>
        </div>
      </body>
      </html>
    `;
    
    return new Response(errorPage, {
      status: 500,
      headers: {
        "Content-Type": "text/html",
        ...corsHeaders,
      },
    });
  }
};

serve(handler);