import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "@/hooks/use-toast";

const PasswordReset = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(true);

  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");
    const error = hashParams.get("error_description");

    if (error) {
      setMessage(`Fehler: ${error}`);
      setMessageType("error");
      setShowEmailForm(true);
      setShowPasswordForm(false);
      return;
    }

    if (type === "recovery" && accessToken && refreshToken) {
      const establishSession = async () => {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setMessage("Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.");
          setMessageType("error");
          setShowEmailForm(true);
          setShowPasswordForm(false);
        } else {
          setMessage("Reset-Link validiert! Du kannst jetzt dein neues Passwort eingeben.");
          setMessageType("success");
          setShowPasswordForm(true);
          setShowEmailForm(false);
        }
      };
      establishSession();
    } else {
        setMessage("Gib deine E-Mail-Adresse ein, um einen Reset-Link zu erhalten.");
        setMessageType("info");
    }
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
      
      await supabase.auth.signOut(); // Wichtig: Temporäre Sitzung beenden
      toast({
        title: "Erfolgreich!",
        description: "Dein Passwort wurde erfolgreich geändert.",
      });
      setMessage("Passwort geändert! Du wirst zur Anmeldung weitergeleitet...");
      setMessageType("success");
      setTimeout(() => navigate("/auth"), 2000);
    }
    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setMessage("");

    const redirectUrl = `${window.location.origin}/auth/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setMessage(error.message || "Fehler beim Senden der E-Mail.");
      setMessageType("error");
    } else {
      setMessage(`Ein Reset-Link wurde an ${email} gesendet!`);
      setMessageType("success");
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Passwort zurücksetzen - HabitBattle</title>
        <meta name="description" content="Setze dein Passwort zurück und erhalte wieder Zugang zu deinem HabitBattle Account." />
        <meta name="robots" content="noindex" />
      </Helmet>
      
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> 
              Passwort zurücksetzen
            </CardTitle>
            <CardDescription>
              {showPasswordForm 
                ? "Gib dein neues Passwort ein"
                : "Wir senden dir einen Reset-Link per E-Mail"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Status Message */}
            {message && (
              <Alert className={
                messageType === 'error' ? 'border-destructive bg-destructive/10 text-destructive' : 
                messageType === 'success' ? 'border-green-500 bg-green-50 text-green-700' : 
                'border-blue-500 bg-blue-50 text-blue-700'
              }>
                {messageType === 'success' ? <CheckCircle className="h-4 w-4" /> : messageType === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Password Update Form */}
            {showPasswordForm && (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <Input 
                    id="password"
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Mindestens 6 Zeichen"
                    required 
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <Input 
                    id="confirmPassword"
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Passwort wiederholen"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  {loading ? "Wird gespeichert..." : "Passwort speichern"}
                </Button>
              </form>
            )}

            {/* Email Request Form */}
            {showEmailForm && (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input 
                    id="email"
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="deine@email.de"
                    required
                    disabled={resetLoading}
                    autoComplete="email"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={resetLoading || !email}>
                  {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {resetLoading ? "Wird gesendet..." : "Reset-Link anfordern"}
                </Button>
              </form>
            )}
            
            {/* Back to Login */}
            <div className="text-center pt-4 border-t">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/auth")}
                className="text-muted-foreground hover:text-foreground"
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