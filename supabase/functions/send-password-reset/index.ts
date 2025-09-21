import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { supabase } from "../_shared/client.ts";

console.log("=== EDGE FUNCTION STARTUP ===");
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

    console.log("Reset link generated, returning to frontend:", resetLink);

    // Return the reset link directly to the frontend
    return new Response(
      JSON.stringify({ 
        success: true, 
        resetLink: resetLink,
        message: `Reset-Link wurde generiert! Bitte kopiere den folgenden Link und öffne ihn in einem neuen Tab:` 
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