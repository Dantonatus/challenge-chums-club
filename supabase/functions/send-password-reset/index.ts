import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { Resend } from 'npm:resend@2.0.0';
import { supabase } from '../_shared/client.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Password reset request received');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    console.log('Processing password reset for email:', email);

    if (!email) {
      throw new Error('Email is required');
    }

    // Check if user exists first
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('Error listing users:', userError);
      throw new Error('Internal server error');
    }

    const userExists = userData.users.some(user => user.email === email);
    console.log('User exists:', userExists);

    if (!userExists) {
      // Don't reveal if user exists or not for security
      return new Response(JSON.stringify({
        success: true,
        message: 'If an account with this email exists, a reset link has been sent.'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Generate password reset for the user using admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://habitbattle.lovable.app/auth/reset'
      }
    });

    if (error) {
      console.error('Error generating reset link:', error);
      throw new Error('Failed to generate reset link');
    }

    console.log('Generated reset link data:', data);

    // Extract the URL and parse tokens
    const resetUrl = data.properties.action_link;
    const urlParams = new URL(resetUrl);
    const token = urlParams.searchParams.get('token');
    const tokenHash = urlParams.searchParams.get('token_hash');
    
    console.log('Reset URL:', resetUrl);
    console.log('Token:', token ? 'present' : 'missing');
    console.log('Token Hash:', tokenHash ? 'present' : 'missing');

    // Send email with both the link and manual token
    const emailResponse = await resend.emails.send({
      from: 'HabitBattle <noreply@habitbattle.lovable.app>',
      to: [email],
      subject: 'Passwort zurücksetzen - HabitBattle',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Passwort zurücksetzen</h1>
          
          <p>Sie haben eine Passwort-Zurücksetzung für Ihr HabitBattle-Konto angefordert.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Option 1: Reset-Link (empfohlen)</h3>
            <a href="${resetUrl}" 
               style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
              Passwort jetzt zurücksetzen
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <h3>Option 2: Manueller Token (falls der Link nicht funktioniert)</h3>
            <p>Falls der obige Link nicht funktioniert, kopieren Sie diesen Token und fügen Sie ihn manuell auf der Reset-Seite ein:</p>
            <code style="background: #f8f9fa; padding: 8px 12px; border-radius: 4px; display: block; margin: 10px 0; font-family: monospace; word-break: break-all;">
              ${token || 'Token konnte nicht generiert werden'}
            </code>
            <p><small>Gehen Sie zu <a href="https://habitbattle.lovable.app/auth/reset">habitbattle.lovable.app/auth/reset</a> und verwenden Sie den "Manual Token" Tab.</small></p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Dieser Link ist 1 Stunde gültig. Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            HabitBattle - Ihre Challenge-Platform
          </p>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset email sent successfully',
      debug: {
        hasToken: !!token,
        hasTokenHash: !!tokenHash,
        resetUrl: resetUrl
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-password-reset function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);