import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { supabase } from "../_shared/client.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "E-Mail-Adresse ist erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate password reset link using Supabase
    const resetUrl = `https://habitbattle.lovable.app/auth/reset`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (resetError) {
      console.error("Supabase reset error:", resetError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Senden der Reset-E-Mail" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send custom email with Resend
    const emailResponse = await resend.emails.send({
      from: "HabitBattle <noreply@habitbattle.lovable.app>",
      to: [email],
      subject: "Passwort zurücksetzen - HabitBattle",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Passwort zurücksetzen</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px; }
            .button { 
              display: inline-block; 
              background: #007bff; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { font-size: 12px; color: #666; text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Passwort zurücksetzen</h1>
            </div>
            <div class="content">
              <p>Hallo,</p>
              <p>du hast eine Anfrage zum Zurücksetzen deines Passworts für HabitBattle gestellt.</p>
              
              <p>Klicke auf den folgenden Button, um dein Passwort zurückzusetzen:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
              </div>
              
              <p>Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
              <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              
              <p><strong>Wichtige Hinweise:</strong></p>
              <ul>
                <li>Dieser Link ist 1 Stunde gültig</li>
                <li>Falls du diese E-Mail nicht angefordert hast, ignoriere sie einfach</li>
                <li>Teile diesen Link mit niemandem</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2024 HabitBattle - Deine Gewohnheiten, deine Herausforderungen</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Custom email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset-Link wurde an ${email} gesendet!` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: "Interner Serverfehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);