import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";

const PasswordReset = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | React.ReactNode>("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [view, setView] = useState<"request_link" | "update_password">("request_link");
  const [sessionEstablished, setSessionEstablished] = useState(false);

  // Check for token_hash in URL and validate recovery tokens
  useEffect(() => {
    const validateRecoveryToken = async () => {
      // Enhanced URL parameter extraction supporting both search and hash
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.substring(1));
      
      // Try search params first, then hash params
      const type = searchParams.get('type') || hashParams.get('type');
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
      
      // Enhanced debugging
      console.log('Password reset URL analysis:', {
        fullURL: window.location.href,
        search: location.search,
        hash: location.hash,
        type,
        hasTokenHash: !!tokenHash,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      });
      
      // Wait briefly for potential delayed URL updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Re-check after delay in case parameters were updated
      const finalSearchParams = new URLSearchParams(window.location.search);
      const finalHashParams = new URLSearchParams(window.location.hash.substring(1));
      const finalType = finalSearchParams.get('type') || finalHashParams.get('type');
      const finalTokenHash = finalSearchParams.get('token_hash') || finalHashParams.get('token_hash');
      
      console.log('Post-delay URL check:', {
        finalType,
        hasFinalTokenHash: !!finalTokenHash,
        URLChanged: type !== finalType || !!tokenHash !== !!finalTokenHash
      });
      
      const effectiveType = finalType || type;
      const effectiveTokenHash = finalTokenHash || tokenHash;
      
      // Handle missing tokens for recovery type with enhanced error messaging
      if (effectiveType === 'recovery' && !effectiveTokenHash && !accessToken) {
        console.error('Password reset error: Recovery type detected but no valid tokens found');
        setMessage(
          <>
            <strong>Reset-Link erkannt, aber Tokens fehlen.</strong>
            <br />
            Dies deutet auf ein Supabase-Konfigurationsproblem hin.
            <br />
            Bitte fordern Sie einen neuen Reset-Link an oder kontaktieren Sie den Support.
          </>
        );
        setMessageType("error");
        setView("request_link");
        return;
      }
      
      // Handle token_hash recovery (modern flow)
      if (effectiveType === 'recovery' && effectiveTokenHash) {
        setLoading(true);
        setMessage("Verarbeite Reset-Link...");
        setMessageType("info");
        
        try {
          console.log('Attempting OTP verification with token_hash');
          const { data, error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: effectiveTokenHash
          });
          
          console.log('OTP verification result:', { 
            hasSession: !!data?.session, 
            hasUser: !!data?.user,
            error: error?.message || 'none' 
          });
          
          if (error) {
            throw new Error(`OTP verification failed: ${error.message}`);
          }
          
          if (data.session) {
            console.log('Session established successfully via token_hash');
            setSessionEstablished(true);
            setView("update_password");
            setMessage("Sie können jetzt Ihr neues Passwort eingeben.");
            setMessageType("info");
            
            // Clean the URL for security
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            throw new Error('No session created after successful OTP verification');
          }
        } catch (error: any) {
          console.error('Token verification failed:', error);
          setMessage(
            <>
              <strong>Reset-Link ungültig oder abgelaufen.</strong>
              <br />
              Fehler: {error.message}
              <br />
              Bitte fordern Sie einen neuen Reset-Link an.
            </>
          );
          setMessageType("error");
          setView("request_link");
        } finally {
          setLoading(false);
        }
      }
      // Handle legacy access_token flow (fallback)
      else if (accessToken && refreshToken && effectiveType === 'recovery') {
        setLoading(true);
        setMessage("Verarbeite Reset-Link (Legacy-Modus)...");
        setMessageType("info");
        
        try {
          console.log('Attempting legacy token session establishment');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) throw new Error(`Legacy session failed: ${error.message}`);
          
          if (data.session) {
            console.log('Session established via legacy tokens');
            setSessionEstablished(true);
            setView("update_password");
            setMessage("Sie können jetzt Ihr neues Passwort eingeben.");
            setMessageType("info");
            
            // Clear the URL for security
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            throw new Error('No session created from legacy tokens');
          }
        } catch (error: any) {
          console.error('Legacy token processing failed:', error);
          setMessage(
            <>
              <strong>Legacy Reset-Link ungültig.</strong>
              <br />
              Fehler: {error.message}
              <br />
              Bitte fordern Sie einen neuen Reset-Link an.
            </>
          );
          setMessageType("error");
          setView("request_link");
        } finally {
          setLoading(false);
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change during password reset:', event, !!session);
      
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('PASSWORD_RECOVERY event received with session');
        setSessionEstablished(true);
        setView("update_password");
        setMessage("Sie können jetzt Ihr neues Passwort eingeben.");
        setMessageType("info");
        setLoading(false);
      }
    });

    validateRecoveryToken();

    return () => {
      subscription.unsubscribe();
    };
  }, [location.search, location.hash]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setMessage("Das Passwort muss mindestens 6 Zeichen lang sein.");
      setMessageType("error");
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage("Die Passwörter stimmen nicht überein.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    // Verify session exists before attempting password update
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("Auth session missing! Bitte fordern Sie einen neuen Reset-Link an.");
      setMessageType("error");
      setLoading(false);
      setView("request_link");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // Log failed password reset
        try {
          await supabase.rpc('log_security_event', {
            event_type: 'password_reset_failed',
            metadata_param: { error: error.message }
          });
        } catch {}

        setMessage(error.message || "Fehler beim Ändern des Passworts.");
        setMessageType("error");
      } else {
        // Log successful password reset
        try {
          await supabase.rpc('log_security_event', {
            event_type: 'password_reset_success',
            metadata_param: { timestamp: new Date().toISOString() }
          });
        } catch {}

        toast({
          title: "Passwort erfolgreich geändert!",
          description: "Sie werden zur Anmeldung weitergeleitet.",
        });
        
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error: any) {
      setMessage("Ein unerwarteter Fehler ist aufgetreten.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://habitbattle.lovable.app/auth/reset"
      });

      if (error) {
        setMessage(error.message || "Fehler beim Senden der Reset-E-Mail.");
        setMessageType("error");
      } else {
        setMessage("Reset-E-Mail wurde gesendet! Bitte überprüfen Sie Ihr Postfach.");
        setMessageType("success");
      }
    } catch (error: any) {
      setMessage("Ein unerwarteter Fehler ist aufgetreten.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = () => {
    switch (messageType) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Passwort zurücksetzen - Challenge Management System</title>
        <meta name="description" content="Setzen Sie Ihr Passwort für das Challenge Management System zurück." />
      </Helmet>
      
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {view === 'update_password' ? 'Neues Passwort' : 'Passwort zurücksetzen'}
            </CardTitle>
            <CardDescription className="text-center">
              {view === 'update_password' ? "Geben Sie Ihr neues Passwort ein" : "Wir senden Ihnen einen Reset-Link"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert className={messageType === "error" ? "border-destructive" : messageType === "success" ? "border-green-500" : "border-blue-500"}>
                {getMessageIcon()}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {view === 'update_password' ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Neues Passwort eingeben"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Passwort bestätigen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Passwort wird aktualisiert...
                    </>
                  ) : (
                    "Passwort aktualisieren"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ihre E-Mail-Adresse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reset-Link wird gesendet...
                    </>
                  ) : (
                    "Reset-Link senden"
                  )}
                </Button>
              </form>
            )}

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')} 
                className="text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Anmeldung
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;