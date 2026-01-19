import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@4.0.0";

// Resend is initialized lazily inside the handler to avoid crashing on missing secrets
// Force redeploy: 2025-08-21T21:16:00Z

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
  // Handle CORS preflight requests
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
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    

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

    

    // Create approval URL for admin
    const approvalUrl = `${Deno.env.get("SUPABASE_URL").replace('/rest/v1', '')}/functions/v1/approve-user?token=${approvalToken}`;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          🔐 New User Registration Approval Required
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">User Details:</h3>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Name:</strong> ${userName || 'Not provided'}</p>
          <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalUrl}" 
             style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            ✅ APPROVE USER
          </a>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #856404; margin-top: 0;">⚠️ Security Notice:</h4>
          <p style="color: #856404; margin-bottom: 0;">
            Only approve users you trust. Once approved, they will have access to all challenges and group data.
          </p>
        </div>

        <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; color: #6c757d; font-size: 12px;">
          <p>This email was sent automatically by your Challenge Management System.</p>
          <p>If you did not expect this email, please check your system for unauthorized registration attempts.</p>
        </div>
      </div>
    `;

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) {
      throw new Error("ADMIN_EMAIL environment variable not set");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable not set");
    }
    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "Challenge System <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `🔐 New User Approval Required: ${userEmail}`,
      html: emailContent,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin notification sent successfully",
      emailId: emailResponse.data?.id 
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