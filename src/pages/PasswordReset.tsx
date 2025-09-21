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
  
  // Parse URL parameters from hash
  const hashParams = new URLSearchParams(
    location.hash ? location.hash.substring(1) : ""
  );
  
  const type = hashParams.get("type");
  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");
  const error = hashParams.get("error");
  
  // Component state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(true);

  // Handle initial state based on URL parameters
  useEffect(() => {
    console.log("🔍 Password Reset - URL Parameters:", {
      type,
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      error
    });

    // Handle errors in URL
    if (error) {
      console.error("❌ Error in reset URL:", error);
      setMessage("Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.");
      setMessageType("error");
      setShowEmailForm(true);
      setShowPasswordForm(false);
      return;
    }

    // Handle valid recovery link
    if (type === "recovery" && access_token && refresh_token) {
      console.log("✅ Valid recovery tokens found, establishing session...");
      
      const establishSession = async () => {
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error("❌ Session error:", sessionError);
            throw sessionError;
          }

          if (data.session) {
            console.log("✅ Session established successfully!");
            setMessage("✅ Reset-Link erfolgreich validiert! Du kannst jetzt dein neues Passwort eingeben.");
            setMessageType("success");
            setShowPasswordForm(true);
            setShowEmailForm(false);
          }
        } catch (err: any) {
          console.error("❌ Failed to establish session:", err);
          setMessage("Fehler beim Verarbeiten des Reset-Links. Bitte fordere einen neuen Link an.");
          setMessageType("error");
          setShowEmailForm(true);
          setShowPasswordForm(false);
        }
      };

      establishSession();
    } else if (type === "recovery") {
      // Recovery type but missing tokens
      console.warn("⚠️ Recovery type detected but tokens missing");
      setMessage("Reset-Link unvollständig. Bitte fordere einen neuen Link an.");
      setMessageType("error");
      setShowEmailForm(true);
      setShowPasswordForm(false);
    } else {
      // Direct access or other cases
      console.log("ℹ️ Direct access to reset page");
      setMessage("Gib deine E-Mail-Adresse ein, um einen Reset-Link zu erhalten.");
      setMessageType("info");
      setShowEmailForm(true);
      setShowPasswordForm(false);
    }
  }, [type, access_token, refresh_token, error]);

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setMessage("Bitte fülle beide Passwort-Felder aus.");
      setMessageType("error");
      return;
    }

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
      console.log("🔄 Updating user password...");
      
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        console.error("❌ Password update error:", error);
        throw error;
      }

      console.log("✅ Password updated successfully!");
      
      // WICHTIGE ERGÄNZUNG: Alte Sitzung sicher beenden
      await supabase.auth.signOut();
      
      toast({
        title: "✅ Erfolgreich!",
        description: "Dein Passwort wurde erfolgreich geändert.",
      });

      setMessage("✅ Passwort erfolgreich geändert! Du wirst zur Anmeldung weitergeleitet...");
      setMessageType("success");

      setTimeout(() => {
        navigate("/auth");
      }, 2000);

    } catch (err: any) {
      console.error("❌ Password update failed:", err);
      setMessage(err.message || "Fehler beim Ändern des Passworts. Bitte versuche es erneut.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Handle reset email request
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setMessage("Bitte gib eine gültige E-Mail-Adresse ein.");
      setMessageType("error");
      return;
    }

    setResetLoading(true);
    setMessage("");

    try {
      console.log("🔄 Sending reset email to:", email);
      
      const redirectUrl = `${window.location.origin}/auth/reset`;
      console.log("🔄 Using redirect URL:", redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("❌ Reset email error:", error);
        throw error;
      }

      console.log("✅ Reset email sent successfully!");
      
      toast({
        title: "✅ E-Mail gesendet!",
        description: `Ein Reset-Link wurde an ${email} gesendet.`,
      });

      setMessage(`✅ Reset-Link wurde an ${email} gesendet! Bitte überprüfe deine E-Mails und klicke auf den Link.`);
      setMessageType("success");

    } catch (err: any) {
      console.error("❌ Reset email failed:", err);
      
      if (err.message.includes("rate")) {
        setMessage("Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.");
      } else {
        setMessage(err.message || "Fehler beim Senden der E-Mail. Bitte versuche es erneut.");
      }
      setMessageType("error");
    } finally {
      setResetLoading(false);
    }
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
                messageType === 'error' ? 'border-destructive bg-destructive/10' : 
                messageType === 'success' ? 'border-green-500 bg-green-50' : 
                'border-blue-500 bg-blue-50'
              }>
                {messageType === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : messageType === 'error' ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <Mail className="h-4 w-4 text-blue-600" />
                )}
                <AlertDescription className={
                  messageType === 'success' ? 'text-green-700' :
                  messageType === 'error' ? 'text-destructive' :
                  'text-blue-700'
                }>
                  {message}
                </AlertDescription>
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
                  {resetLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Reset-Link wird gesendet...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset-Link anfordern
                    </>
                  )}
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