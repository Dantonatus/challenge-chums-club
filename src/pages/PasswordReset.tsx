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
    // Debug logs for URL parameters
    console.log("🔍 Password Reset Debug - Current URL:", window.location.href);
    console.log("🔍 Hash:", hash);
    console.log("🔍 Search:", search);
    console.log("🔍 Full location:", window.location);
    
    // Also check if we're being redirected from Supabase with different URL format
    const fullUrl = window.location.href;
    if (fullUrl.includes('access_token=') || fullUrl.includes('type=recovery')) {
      console.log("🔍 Detected Supabase redirect URL format");
    }
    
    // Parse both hash fragment and query parameters
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const q = new URLSearchParams(search);
    
    // Also try parsing the entire URL for edge cases
    const url = new URL(window.location.href);
    const allParams = new URLSearchParams(url.search);
    
    const get = (key: string) => params.get(key) || q.get(key) || allParams.get(key);
    
    const result = {
      type: get("type"),
      access_token: get("access_token"),
      refresh_token: get("refresh_token"),
      error: get("error"),
      error_description: get("error_description"),
      // Also check for potential error codes from Supabase
      error_code: get("error_code"),
      message: get("message"),
    };
    
    console.log("🔍 Parsed params:", result);
    return result;
  }, [hash, search]);
}

const PasswordReset = () => {
  const navigate = useNavigate();
  const { type, error, error_description } = useHashParams();
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

  console.log("🔍 Password Reset Component - type:", type, "error:", error);

  // Ensure session is initialized when redirected from email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // nothing, we only need the client to pick tokens from URL
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    console.log("🔍 Effect triggered - type:", type, "error:", error, "error_description:", error_description);
    
    if (error) {
      const errorMsg = error_description || error;
      console.log("❌ Error detected:", errorMsg);
      
      // Special handling for common Supabase errors
      if (errorMsg.includes("token") || errorMsg.includes("expired") || errorMsg.includes("invalid")) {
        setMsg("❌ Der Reset-Link ist abgelaufen oder wurde bereits verwendet. Das Problem liegt wahrscheinlich am Supabase Email-Template.");
        setShowEmailInput(true);
        setShowManualEntry(true);
      } else {
        setMsg(`❌ Fehler: ${errorMsg}`);
      }
      setMsgType("error");
    } else if (type === null || type === undefined) {
      console.log("⚠️ No type parameter found - might be invalid link");
      setMsg("❌ Ungültiger Link. Das Supabase Email-Template verwendet wahrscheinlich die falsche Variable ({{ .ConfirmationURL }} statt {{ .RedirectTo }}).");
      setMsgType("error");
      setShowEmailInput(true);
      setShowManualEntry(true);
    } else if (type !== "recovery") {
      console.log("⚠️ Wrong type:", type, "Expected: recovery");
      setMsg(`❌ Unerwarteter Link-Typ: ${type}. Bitte fordere einen neuen Reset-Link an.`);
      setMsgType("error");
      setShowEmailInput(true);
    } else {
      console.log("✅ Valid recovery link detected");
      setMsg("✅ Gültiger Reset-Link! Du kannst jetzt ein neues Passwort setzen.");
      setMsgType("success");
    }
  }, [type, error, error_description]);

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset-Link gesendet!",
        description: "ACHTUNG: Das Email-Template muss manuell korrigiert werden!",
      });
      
      setMsg("✅ Neuer Reset-Link wurde an deine E-Mail-Adresse gesendet. ACHTUNG: Das Supabase Email-Template muss manuell von {{ .ConfirmationURL }} zu {{ .RedirectTo }} geändert werden!");
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

            {type === "recovery" ? (
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
                    <div><strong>Error:</strong> {error || 'null'}</div>
                    <div><strong>Error Description:</strong> {error_description || 'null'}</div>
                  </div>
                  
                  <div className="text-sm space-y-2 p-3 bg-amber-50 border border-amber-200 rounded">
                    <div className="font-medium text-amber-800">Bekanntes Problem:</div>
                    <div className="text-amber-700">
                      Das Supabase Email-Template verwendet <code>{'{{ .ConfirmationURL }}'}</code> statt <code>{'{{ .RedirectTo }}'}</code>.
                      Dies muss manuell im Supabase Dashboard korrigiert werden:
                    </div>
                    <div className="text-xs text-amber-600">
                      Authentication → Email Templates → Reset Password
                    </div>
                  </div>
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
