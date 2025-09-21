import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Mail } from "lucide-react";
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
  const [message, setMessage] = useState<{type: "success" | "error" | "info", text: string} | string>("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [view, setView] = useState<'request_link' | 'update_password'>('request_link');

  const handleUrlHash = useCallback(async () => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");
    const error = hashParams.get("error_description");

    if (error) {
      setMessage(`Fehler: ${error}`);
      setMessageType("error");
      setView('request_link');
      return;
    }

    if (type === "recovery" && accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setMessage("Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.");
        setMessageType("error");
        setView('request_link');
      } else {
        setMessage("Link validiert! Gib dein neues Passwort ein.");
        setMessageType("success");
        setView('update_password');
      }
    } else {
        setMessage("Gib deine E-Mail-Adresse ein, um einen Reset-Link zu erhalten.");
        setMessageType("info");
    }
  }, [location.hash]);

  useEffect(() => {
    handleUrlHash();
  }, [handleUrlHash]);
  
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
      
      await supabase.auth.signOut();
      toast({
        title: "Erfolgreich!",
        description: "Dein Passwort wurde geändert.",
      });
      setMessage("Passwort geändert! Du wirst zur Anmeldung weitergeleitet...");
      setMessageType("success");
      setTimeout(() => navigate("/auth"), 2000);
    }
    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    console.log("=== PASSWORD RESET DEBUG START ===");
    console.log("Attempting to call send-password-reset function with email:", email);
    console.log("Supabase project URL: https://kehbzhcmalmqxygmhijp.supabase.co");

    try {
      console.log("Invoking edge function...");
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email }
      });

      console.log("=== EDGE FUNCTION RESPONSE ===");
      console.log("Function response data:", data);
      console.log("Function response error:", error);
      console.log("=== PASSWORD RESET DEBUG END ===");

      if (error) {
        console.error("=== EDGE FUNCTION ERROR ===", error);
        setMessage("Fehler: " + (error.message || 'Unbekannter Fehler beim Aufrufen der Edge Function'));
        setMessageType("error");
        return;
      }

      if (data?.error) {
        console.error("=== BUSINESS LOGIC ERROR ===", data.error);
        setMessage(data.error);
        setMessageType("error");
        return;
      }

      if (data?.success) {
        console.log("=== SUCCESS ===", data.message);
        setMessage(data.message || "Reset-Link wurde gesendet!");
        setMessageType("success");
      } else {
        console.warn("=== UNEXPECTED RESPONSE ===", data);
        setMessage("Unerwartete Antwort vom Server");
        setMessageType("error");
      }
    } catch (error) {
      console.error("=== REQUEST ERROR ===", error);
      setMessage("Fehler beim Senden der E-Mail. Bitte versuche es erneut.");
      setMessageType("error");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Passwort zurücksetzen - HabitBattle</title>
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> 
            Passwort zurücksetzen
          </CardTitle>
          <CardDescription>
            {view === 'update_password' ? "Gib dein neues Passwort ein" : "Wir senden dir einen Reset-Link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={
              messageType === 'success' ? 'border-green-500 bg-green-50 text-green-700' : ''
            }>
              {messageType === 'success' ? <CheckCircle className="h-4 w-4" /> : messageType === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              <AlertDescription>{typeof message === 'string' ? message : message.text}</AlertDescription>
            </Alert>
          )}

          {view === 'update_password' ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Neues Passwort</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Passwort speichern
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} autoComplete="email" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Reset-Link anfordern
              </Button>
            </form>
          )}
          <div className="text-center pt-4 border-t">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Anmeldung
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordReset;