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

  // Check if we have tokens in the URL hash for password update
  useEffect(() => {
    let sessionCheckTimeout: NodeJS.Timeout;
    
    const handleUrlHash = async () => {
      const hash = location.hash;
      console.log('Password reset URL hash:', hash);
      
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        console.log('Reset parameters:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        
        if (accessToken && type === 'recovery') {
          setLoading(true);
          setMessage("Verarbeite Reset-Link...");
          setMessageType("info");
          
          // Wait for Supabase to automatically process the session
          let attempts = 0;
          const maxAttempts = 10;
          
          const checkSession = async () => {
            try {
              const { data: { session }, error } = await supabase.auth.getSession();
              console.log(`Session check attempt ${attempts + 1}:`, { session: !!session, error });
              
              if (session && session.user) {
                console.log('Session established successfully');
                setView("update_password");
                setMessage("Sie können jetzt Ihr neues Passwort eingeben.");
                setMessageType("info");
                setLoading(false);
                
                // Clear the URL hash for security after successful session establishment
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
              }
              
              attempts++;
              if (attempts < maxAttempts) {
                sessionCheckTimeout = setTimeout(checkSession, 500);
              } else {
                console.error('Session not established after maximum attempts');
                setMessage("Fehler beim Verarbeiten des Reset-Links. Bitte fordern Sie einen neuen an.");
                setMessageType("error");
                setLoading(false);
                
                // Clear the URL hash even on failure
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            } catch (error) {
              console.error('Error checking session:', error);
              setMessage("Fehler beim Verarbeiten des Reset-Links. Bitte versuchen Sie es erneut.");
              setMessageType("error");
              setLoading(false);
            }
          };
          
          // Start checking for session
          checkSession();
        } else {
          setMessage("Ungültiger Reset-Link. Bitte fordern Sie einen neuen an.");
          setMessageType("error");
          // Clear invalid hash
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change during password reset:', event, !!session);
      
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('PASSWORD_RECOVERY event received with session');
        setView("update_password");
        setMessage("Sie können jetzt Ihr neues Passwort eingeben.");
        setMessageType("info");
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('TOKEN_REFRESHED event received');
        // Session is valid, ensure we're in the right view
        if (view !== "update_password") {
          setView("update_password");
          setMessage("Sie können jetzt Ihr neues Passwort eingeben.");
          setMessageType("info");
          setLoading(false);
        }
      }
    });

    handleUrlHash();

    return () => {
      subscription.unsubscribe();
      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
      }
    };
  }, [location.hash]);

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
        redirectTo: `${window.location.origin}/auth/reset`
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