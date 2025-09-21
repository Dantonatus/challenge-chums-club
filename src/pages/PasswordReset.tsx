import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, Key, Mail, Bug } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";

const PasswordReset = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | React.ReactNode>("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [view, setView] = useState<"request_link" | "update_password" | "manual_token">("request_link");
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    fullURL: "",
    hasTokenHash: false,
    hasAccessToken: false,
    type: "",
    searchParams: "",
    hashParams: ""
  });

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
      
      // Update debug info
      setDebugInfo({
        fullURL: window.location.href,
        hasTokenHash: !!tokenHash,
        hasAccessToken: !!accessToken,
        type: type || "none",
        searchParams: location.search,
        hashParams: location.hash
      });
      
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
      
      // If no type detected, this is just a normal page load
      if (!type) {
        return;
      }
      
      // Handle missing tokens for recovery type - show manual token option
      if (type === 'recovery' && !tokenHash && !accessToken) {
        console.error('Password reset error: Recovery type detected but no valid tokens found');
        setMessage(
          <>
            <strong>Automatische Token-Erkennung fehlgeschlagen.</strong>
            <br />
            Verwenden Sie den "Manueller Token" Tab oder fordern Sie einen neuen Link an.
          </>
        );
        setMessageType("error");
        setView("manual_token");
        return;
      }
      
      // Handle token_hash recovery (modern flow)
      if (type === 'recovery' && tokenHash) {
        setLoading(true);
        setMessage("Verarbeite Reset-Link...");
        setMessageType("info");
        
        try {
          console.log('Attempting OTP verification with token_hash');
          const { data, error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash
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
      else if (accessToken && refreshToken && type === 'recovery') {
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

  const handleManualTokenReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualToken || manualToken.length < 10) {
      setMessage("Bitte geben Sie einen gültigen Token ein.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("Token wird verarbeitet...");
    setMessageType("info");

    try {
      // Try to verify the manual token
      const { data, error } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: manualToken
      });

      if (error) {
        throw new Error(`Token-Verifikation fehlgeschlagen: ${error.message}`);
      }

      if (data.session) {
        console.log('Session established via manual token');
        setSessionEstablished(true);
        setView("update_password");
        setMessage("Token erfolgreich! Sie können jetzt Ihr neues Passwort eingeben.");
        setMessageType("success");
      } else {
        throw new Error('Keine Session nach Token-Verifikation');
      }
    } catch (error: any) {
      console.error('Manual token verification failed:', error);
      setMessage(
        <>
          <strong>Token ungültig oder abgelaufen.</strong>
          <br />
          Fehler: {error.message}
          <br />
          Bitte fordern Sie einen neuen Reset-Link an.
        </>
      );
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
        setMessage(
          <>
            <strong>Reset-E-Mail wurde gesendet!</strong>
            <br />
            Falls der Link nicht funktioniert, verwenden Sie den "Manueller Token" Tab.
            <br />
            Kopieren Sie den Token aus der E-Mail und fügen Sie ihn manuell ein.
          </>
        );
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
              {view === 'update_password' 
                ? "Geben Sie Ihr neues Passwort ein" 
                : "Mehrere Wege zum Zurücksetzen Ihres Passworts"}
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
              <Tabs defaultValue="reset-link" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="reset-link" className="text-xs">
                    <Mail className="w-4 h-4 mr-1" />
                    Reset-Link
                  </TabsTrigger>
                  <TabsTrigger value="manual-token" className="text-xs">
                    <Key className="w-4 h-4 mr-1" />
                    Manual Token
                  </TabsTrigger>
                  <TabsTrigger value="debug" className="text-xs">
                    <Bug className="w-4 h-4 mr-1" />
                    Debug Info
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="reset-link" className="space-y-4 mt-4">
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
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Neuen Reset-Link anfordern
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="manual-token" className="space-y-4 mt-4">
                  <form onSubmit={handleManualTokenReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualToken">Reset-Token aus E-Mail</Label>
                      <Input
                        id="manualToken"
                        type="text"
                        placeholder="Kopieren Sie den Token aus der Reset-E-Mail hier ein"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <p className="text-sm text-muted-foreground">
                        Öffnen Sie die Reset-E-Mail und kopieren Sie den langen Token-String (beginnt meist mit token_hash=)
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Token wird verarbeitet...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Token verwenden
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="debug" className="space-y-4 mt-4">
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>URL:</strong> {debugInfo.fullURL || "Keine URL"}
                    </div>
                    <div>
                      <strong>Typ:</strong> {debugInfo.type || "Kein Typ erkannt"}
                    </div>
                    <div>
                      <strong>Token Hash vorhanden:</strong> {debugInfo.hasTokenHash ? "✅ Ja" : "❌ Nein"}
                    </div>
                    <div>
                      <strong>Access Token vorhanden:</strong> {debugInfo.hasAccessToken ? "✅ Ja" : "❌ Nein"}
                    </div>
                    <div>
                      <strong>Search Parameter:</strong> {debugInfo.searchParams || "Keine"}
                    </div>
                    <div>
                      <strong>Hash Parameter:</strong> {debugInfo.hashParams || "Keine"}
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Probleme beim Reset?</strong>
                      <br />
                      • Prüfen Sie Ihr E-Mail-Postfach und Spam-Ordner
                      • Reset-Links sind nur 1 Stunde gültig
                      • Jeder Link kann nur einmal verwendet werden
                      <br />
                      <strong>Fehlende Tokens?</strong>
                      <br />
                      Dies ist ein Supabase-Konfigurationsproblem. Verwenden Sie den "Manual Token" Tab als Workaround.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
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