import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "@/hooks/use-toast";

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
        setMsg("Der Reset-Link ist abgelaufen oder wurde bereits verwendet.");
        setShowEmailInput(true);
      } else {
        setMsg(`Fehler: ${errorMsg}`);
      }
      setMsgType("error");
    } else if (type === null || type === undefined) {
      console.log("⚠️ No type parameter found - might be invalid link");
      setMsg("Ungültiger Link. Der Link ist möglicherweise abgelaufen oder wurde bereits verwendet.");
      setMsgType("error");
      setShowEmailInput(true);
    } else if (type !== "recovery") {
      console.log("⚠️ Wrong type:", type, "Expected: recovery");
      setMsg(`Unerwarteter Link-Typ: ${type}. Bitte fordere einen neuen Reset-Link an.`);
      setMsgType("error");
      setShowEmailInput(true);
    } else {
      console.log("✅ Valid recovery link detected");
      setMsg("✓ Gültiger Reset-Link! Du kannst jetzt ein neues Passwort setzen.");
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
        description: "Prüfe dein E-Mail-Postfach für den neuen Reset-Link.",
      });
      
      setMsg("✓ Neuer Reset-Link wurde an deine E-Mail-Adresse gesendet. Prüfe dein Postfach.");
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
                : "Fordere einen neuen Reset-Link an oder kehre zur Anmeldung zurück."
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
              // Invalid or expired link - show recovery options
              <div className="space-y-4">
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
              </div>
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
