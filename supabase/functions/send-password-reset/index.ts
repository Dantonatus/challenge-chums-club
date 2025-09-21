import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { supabase } from "../_shared/client.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

console.log("=== EDGE FUNCTION STARTUP ===");
console.log("RESEND_API_KEY available:", !!Deno.env.get("RESEND_API_KEY"));
console.log("SUPABASE_URL available:", !!Deno.env.get("SUPABASE_URL"));
console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

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
    console.log("Password reset function called");
    const { email }: PasswordResetRequest = await req.json();
    console.log("Email provided:", email);

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "E-Mail-Adresse ist erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate password reset link using Supabase Admin API
    console.log("Generating reset link...");
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://habitbattle.lovable.app/auth/reset'
      }
    });

    if (linkError) {
      console.error("Supabase link generation error:", linkError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Generieren des Reset-Links" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reset link generated successfully");

    // Extract the actual reset link from the response
    const resetLink = linkData.properties?.action_link;
    
    if (!resetLink) {
      console.error("No reset link generated");
      return new Response(
        JSON.stringify({ error: "Fehler beim Generieren des Reset-Links" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending email with reset link:", resetLink);

    // Send simple text email with Resend
    const emailResponse = await resend.emails.send({
      from: "HabitBattle <noreply@habitbattle.lovable.app>",
      to: [email],
      subject: "Passwort zurücksetzen - HabitBattle",
      text: `
Hallo,

du hast eine Anfrage zum Zurücksetzen deines Passworts für HabitBattle gestellt.

Kopiere diesen Link in deinen Browser, um dein Passwort zurückzusetzen:

${resetLink}

Wichtige Hinweise:
- Dieser Link ist 1 Stunde gültig
- Falls du diese E-Mail nicht angefordert hast, ignoriere sie einfach
- Teile diesen Link mit niemandem

© 2024 HabitBattle - Deine Gewohnheiten, deine Herausforderungen
      `,
    });

    console.log("Custom email sent successfully:", emailResponse);

    if (emailResponse.error) {
      console.error("Resend email error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: "Fehler beim Senden der E-Mail" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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