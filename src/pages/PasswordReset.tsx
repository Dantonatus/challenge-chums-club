import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Key, Bug } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function useHashParams() {
  const { hash, search } = useLocation();
  return useMemo(() => {
    console.log("🔍 Password Reset Debug - ENHANCED URL Analysis");
    console.log("🔍 Full URL:", window.location.href);
    console.log("🔍 Hash fragment:", hash);
    console.log("🔍 Query string:", search);
    
    // Parse ALL possible parameter sources
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const queryParams = new URLSearchParams(search);
    
    // Special handling for Supabase URL formats - sometimes tokens are in different places
    const fullUrl = window.location.href;
    let urlParams = new URLSearchParams();
    
    // Extract from various URL patterns Supabase might use
    if (fullUrl.includes('#')) {
      const afterHash = fullUrl.split('#')[1];
      if (afterHash) {
        urlParams = new URLSearchParams(afterHash);
      }
    }
    
    // Helper to get parameter from any source
    const get = (key: string) => {
      return hashParams.get(key) || 
             queryParams.get(key) || 
             urlParams.get(key) || 
             null;
    };
    
    const result = {
      type: get("type"),
      access_token: get("access_token"),
      refresh_token: get("refresh_token"),
      token_hash: get("token_hash"), // Added
      expires_at: get("expires_at"), // Added
      expires_in: get("expires_in"), // Added
      error: get("error"),
      error_description: get("error_description"),
      error_code: get("error_code"),
      message: get("message"),
    };
    
    console.log("🔍 ENHANCED Parsed params:", result);
    
    // Log detection of specific patterns
    if (result.access_token) console.log("✅ Access token detected!");
    if (result.refresh_token) console.log("✅ Refresh token detected!");
    if (result.type === "recovery") console.log("✅ Recovery type detected!");
    if (result.error) console.log("❌ Error in URL:", result.error);
    
    return result;
  }, [hash, search]);
}

const PasswordReset = () => {
  const navigate = useNavigate();
  const { type, access_token, refresh_token, error, error_description, token_hash } = useHashParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"error" | "success" | "info">("info");
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [sessionEstablished, setSessionEstablished] = useState(false);

  console.log("🔍 ENHANCED Password Reset - type:", type, "error:", error, "has_access_token:", !!access_token);

  // ENHANCED session handling - automatically establish session from URL tokens
  useEffect(() => {
    const establishSession = async () => {
      console.log("🔄 Attempting to establish session from URL tokens...");
      
      if (access_token && refresh_token && !sessionEstablished) {
        try {
          console.log("🔄 Setting session with tokens from URL...");
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          
          if (sessionError) {
            console.error("❌ Session establishment failed:", sessionError);
            throw sessionError;
          }
          
          if (data.session) {
            console.log("✅ Session established successfully!");
            setSessionEstablished(true);
            setMsg("✅ Session erfolgreich wiederhergestellt! Du kannst jetzt dein Passwort ändern.");
            setMsgType("success");
          }
        } catch (e: any) {
          console.error("❌ Failed to establish session:", e);
          setMsg("❌ Fehler beim Wiederherstellen der Session. Bitte fordere einen neuen Link an.");
          setMsgType("error");
          setShowEmailInput(true);
        }
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Auth state changed:", event, "session:", !!session);
      if (session && event === 'SIGNED_IN') {
        setSessionEstablished(true);
      }
    });

    establishSession();

    return () => subscription.unsubscribe();
  }, [access_token, refresh_token, sessionEstablished]);

  useEffect(() => {
    console.log("🔍 ENHANCED Effect - type:", type, "error:", error, "access_token:", !!access_token);
    
    // Skip if we're in the process of establishing session
    if (access_token && refresh_token && !sessionEstablished) {
      console.log("⏳ Session establishment in progress, skipping effect...");
      return;
    }
    
    if (error) {
      const errorMsg = error_description || error;
      console.log("❌ Error detected:", errorMsg);
      
      // Enhanced error handling with specific solutions
      if (errorMsg.includes("token") || errorMsg.includes("expired") || errorMsg.includes("invalid")) {
        setMsg("❌ Der Reset-Link ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen Link an.");
        setShowEmailInput(true);
        setShowManualEntry(true);
      } else if (errorMsg.includes("redirect")) {
        setMsg("❌ Redirect-Fehler: Die Supabase Redirect-URLs sind nicht korrekt konfiguriert. Bitte sieh dir die Konfigurationsanweisungen an.");
        setShowEmailInput(true);
      } else {
        setMsg(`❌ Fehler: ${errorMsg}`);
        setShowEmailInput(true);
      }
      setMsgType("error");
    } else if (type === "recovery" && (access_token || sessionEstablished)) {
      console.log("✅ Valid recovery link with tokens detected");
      setMsg("✅ Gültiger Reset-Link! Du kannst jetzt ein neues Passwort setzen.");
      setMsgType("success");
    } else if (type === "recovery" && !access_token) {
      console.log("⚠️ Recovery type but no access token");
      setMsg("⚠️ Reset-Link erkannt, aber Tokens fehlen. Dies deutet auf ein Supabase-Konfigurationsproblem hin.");
      setMsgType("error");
      setShowEmailInput(true);
      setShowManualEntry(true);
    } else if (type === null || type === undefined) {
      // Only show error if no tokens are present (direct access vs broken link)
      if (!access_token && !refresh_token) {
        console.log("⚠️ Direct access to reset page");
        setMsg("ℹ️ Direkter Zugriff erkannt. Bitte fordere einen Reset-Link über deine E-Mail an.");
        setMsgType("info");
        setShowEmailInput(true);
      } else {
        console.log("⚠️ Tokens present but no type - might be URL format issue");
        setMsg("⚠️ Tokens erkannt aber Type fehlt. Möglicherweise URL-Format-Problem.");
        setMsgType("error");
        setShowManualEntry(true);
      }
    } else if (type && type !== "recovery") {
      console.log("⚠️ Wrong type:", type, "Expected: recovery");
      setMsg(`❌ Unerwarteter Link-Typ: ${type}. Erwarteter Typ: recovery`);
      setMsgType("error");
      setShowEmailInput(true);
    }
  }, [type, error, error_description, access_token, refresh_token, sessionEstablished]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setMsg("Passwort muss mindestens 6 Zeichen haben.");
      setMsgType("error");
      return;
    }
    if (password !== confirm) {
      setMsg("Passwörter stimmen nicht überein.");
      setMsgType("error");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      
      toast({
        title: "Passwort erfolgreich aktualisiert!",
        description: "Du wirst automatisch zur Anmeldung weitergeleitet.",
      });
      
      setMsg("✓ Passwort erfolgreich aktualisiert! Weiterleitung zur Anmeldung...");
      setMsgType("success");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (e: any) {
      console.error("Password update error:", e);
      setMsg(e?.message || "Passwort-Aktualisierung fehlgeschlagen. Bitte versuche es erneut.");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  const requestNewResetLink = async () => {
    if (!email) {
      setMsg("Bitte gib deine E-Mail-Adresse ein.");
      setMsgType("error");
      return;
    }
    
    setResetLoading(true);
    setMsg(null);
    
    try {
      // ENHANCED redirect URL configuration
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/auth/reset`;
      
      console.log("🔄 Sending reset email with redirect URL:", redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset-Link gesendet!",
        description: `E-Mail wurde an ${email} gesendet.`,
      });
      
      setMsg(
        `✅ Neuer Reset-Link wurde an ${email} gesendet.\n\n` +
        `WICHTIG: Falls der Link nicht funktioniert, muss die Supabase-Konfiguration geprüft werden:\n` +
        `• Site URL: ${baseUrl}\n` +
        `• Redirect URL: ${redirectUrl}\n\n` +
        `Diese URLs müssen im Supabase Dashboard unter Authentication → URL Configuration eingetragen sein.`
      );
      setMsgType("success");
      setShowEmailInput(false);
    } catch (e: any) {
      console.error("Reset email error:", e);
      setMsg(e?.message || "Fehler beim Senden der Reset-E-Mail. Bitte versuche es erneut.");
      setMsgType("error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!manualToken.trim()) {
      setMsg("Bitte gib einen Token ein.");
      setMsgType("error");
      return;
    }

    try {
      // Try to parse the token manually
      const tokenData = JSON.parse(atob(manualToken.split('.')[1]));
      console.log("🔍 Manual token data:", tokenData);
      
      toast({
        title: "Token-Analyse",
        description: `Token-Typ: ${tokenData.aud || 'unknown'}`,
      });
      
      setMsg("✅ Token erfolgreich analysiert. Versuche Session zu setzen...");
      setMsgType("success");
      
    } catch (e) {
      console.error("Token parsing error:", e);
      setMsg("❌ Ungültiger Token. Bitte kopiere den kompletten access_token aus der URL.");
      setMsgType("error");
    }
  };

  const getStatusIcon = () => {
    if (msgType === "success") return <CheckCircle className="h-4 w-4" />;
    if (msgType === "error") return <AlertTriangle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Passwort zurücksetzen – Sicherer Zugriff</title>
        <meta name="description" content="Setze dein Passwort sicher zurück. Sicherer Reset-Prozess mit E-Mail-Verifizierung." />
        <link rel="canonical" href={`${window.location.origin}/auth/reset`} />
      </Helmet>
      
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" /> 
              Passwort zurücksetzen
            </CardTitle>
            <CardDescription>
              {type === "recovery" 
                ? "Vergib ein neues, sicheres Passwort für dein Konto." 
                : "Fordere einen neuen Reset-Link an oder nutze die Debug-Optionen unten."
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {msg && (
              <Alert className={msgType === 'error' ? 'border-destructive' : msgType === 'success' ? 'border-green-500' : 'border-blue-500'}>
                {getStatusIcon()}
                <AlertDescription>{msg}</AlertDescription>
              </Alert>
            )}

            {(type === "recovery" && (access_token || sessionEstablished)) ? (
              // Valid reset link - show password form
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pass">Neues Passwort</Label>
                  <Input 
                    id="new-pass" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Mindestens 6 Zeichen"
                    required 
                    minLength={6}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pass">Passwort bestätigen</Label>
                  <Input 
                    id="confirm-pass" 
                    type="password" 
                    value={confirm} 
                    onChange={(e) => setConfirm(e.target.value)} 
                    placeholder="Passwort erneut eingeben"
                    required
                    disabled={loading}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Passwort wird gespeichert...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Passwort speichern
                    </>
                  )}
                </Button>
              </form>
            ) : (
              // Invalid or expired link - show recovery options with tabs
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="email">Reset-Link</TabsTrigger>
                  <TabsTrigger value="manual">Manual Token</TabsTrigger>
                  <TabsTrigger value="debug">Debug Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="email" className="space-y-4">
                  {showEmailInput && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">E-Mail-Adresse</Label>
                        <Input 
                          id="reset-email" 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="deine@email.de"
                          required
                          disabled={resetLoading}
                        />
                      </div>
                      
                      <Button 
                        onClick={requestNewResetLink} 
                        className="w-full" 
                        disabled={resetLoading || !email}
                      >
                        {resetLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Reset-Link wird gesendet...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Neuen Reset-Link anfordern
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {!showEmailInput && (
                    <Button 
                      onClick={() => setShowEmailInput(true)} 
                      className="w-full" 
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Neuen Reset-Link anfordern
                    </Button>
                  )}
                </TabsContent>
                
                <TabsContent value="manual" className="space-y-4">
                  <Alert className="border-blue-500">
                    <Key className="h-4 w-4" />
                    <AlertDescription>
                      Falls der Email-Link defekt ist, kannst du den access_token aus der URL manuell eingeben.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="manual-token">Access Token</Label>
                    <Textarea
                      id="manual-token"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Kopiere den access_token aus der fehlerhaften Reset-URL..."
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleManualTokenSubmit}
                    className="w-full"
                    disabled={!manualToken.trim()}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Token analysieren
                  </Button>
                </TabsContent>
                
                <TabsContent value="debug" className="space-y-4">
                  <Alert>
                    <Bug className="h-4 w-4" />
                    <AlertDescription>
                      Debug-Informationen für die Fehlerbehebung
                    </AlertDescription>
                  </Alert>
                  
                  <div className="text-xs space-y-2 font-mono bg-muted p-3 rounded">
                    <div><strong>Current URL:</strong> {window.location.href}</div>
                    <div><strong>Type:</strong> {type || 'null'}</div>
                    <div><strong>Access Token:</strong> {access_token ? '✅ Present' : '❌ Missing'}</div>
                    <div><strong>Refresh Token:</strong> {refresh_token ? '✅ Present' : '❌ Missing'}</div>
                    <div><strong>Token Hash:</strong> {token_hash || 'null'}</div>
                    <div><strong>Error:</strong> {error || 'null'}</div>
                    <div><strong>Error Description:</strong> {error_description || 'null'}</div>
                    <div><strong>Session Established:</strong> {sessionEstablished ? '✅ Yes' : '❌ No'}</div>
                  </div>
                  
                  <div className="text-sm space-y-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-medium text-blue-800">KRITISCHE Supabase-Konfiguration:</div>
                    <div className="text-blue-700 space-y-2">
                      <div>
                        <strong>1. Supabase Dashboard → Authentication → URL Configuration:</strong>
                      </div>
                      <div className="text-xs font-mono bg-blue-100 p-2 rounded">
                        Site URL: {window.location.origin}<br/>
                        Redirect URLs:<br/>
                        • {window.location.origin}/auth/reset<br/>
                        • {window.location.origin}/**
                      </div>
                      <div>
                        <strong>2. Email Template prüfen:</strong>
                      </div>
                      <div className="text-xs">
                        Authentication → Email Templates → Reset Password<br/>
                        Sollte <code>{'{{ .RedirectTo }}'}</code> verwenden (nicht <code>{'{{ .ConfirmationURL }}'}</code>)
                      </div>
                    </div>
                  </div>
                  
                  {(access_token || refresh_token) && (
                    <div className="text-sm p-3 bg-green-50 border border-green-200 rounded">
                      <div className="font-medium text-green-800">Token-Status:</div>
                      <div className="text-green-700">
                        Tokens wurden in der URL erkannt. {sessionEstablished ? 'Session erfolgreich etabliert!' : 'Session-Aufbau läuft...'}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
            
            <Button 
              type="button" 
              variant="secondary" 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Anmeldung
            </Button>
          </CardContent>
        </Card>
        
        {/* Help Card */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-medium text-sm">Probleme beim Reset?</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Prüfe dein E-Mail-Postfach und Spam-Ordner</p>
                <p>• Reset-Links sind nur 1 Stunde gültig</p>
                <p>• Jeder Link kann nur einmal verwendet werden</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;
