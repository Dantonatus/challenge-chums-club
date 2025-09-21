import { useEffect, useState } from "react";
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

const PasswordReset = () => {
  const navigate = useNavigate();
  const { hash } = useLocation();
  
  // Extract URL parameters
  const urlParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const type = urlParams.get("type");
  const access_token = urlParams.get("access_token");
  const refresh_token = urlParams.get("refresh_token");
  const error = urlParams.get("error");
  
  // State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" }>({ text: "", type: "info" });
  const [isValidResetLink, setIsValidResetLink] = useState(false);

  // Check if this is a valid reset link
  useEffect(() => {
    if (error) {
      setMessage({ 
        text: "Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.", 
        type: "error" 
      });
      return;
    }

    if (type === "recovery" && access_token && refresh_token) {
      // Establish session with the tokens
      const establishSession = async () => {
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          
          if (sessionError) throw sessionError;
          
          setIsValidResetLink(true);
          setMessage({ 
            text: "Gültiger Reset-Link! Du kannst jetzt ein neues Passwort eingeben.", 
            type: "success" 
          });
        } catch (e: any) {
          setMessage({ 
            text: "Fehler beim Verarbeiten des Reset-Links. Bitte fordere einen neuen Link an.", 
            type: "error" 
          });
        }
      };
      
      establishSession();
    } else if (!type && !access_token) {
      // Direct access without reset link
      setMessage({ 
        text: "Bitte fordere einen Reset-Link über deine E-Mail-Adresse an.", 
        type: "info" 
      });
    } else {
      setMessage({ 
        text: "Ungültiger Reset-Link. Bitte fordere einen neuen Link an.", 
        type: "error" 
      });
    }
  }, [type, access_token, refresh_token, error]);

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setMessage({ text: "Das Passwort muss mindestens 6 Zeichen lang sein.", type: "error" });
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage({ text: "Die Passwörter stimmen nicht überein.", type: "error" });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast({
        title: "Passwort erfolgreich geändert!",
        description: "Du wirst zur Anmeldung weitergeleitet.",
      });
      
      setMessage({ text: "Passwort erfolgreich geändert! Weiterleitung...", type: "success" });
      
      setTimeout(() => navigate("/auth"), 2000);
    } catch (e: any) {
      setMessage({ 
        text: e.message || "Fehler beim Ändern des Passworts. Bitte versuche es erneut.", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle reset email request
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: "Bitte gib deine E-Mail-Adresse ein.", type: "error" });
      return;
    }

    setResetLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/auth/reset`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset-Link gesendet!",
        description: `Ein Reset-Link wurde an ${email} gesendet.`,
      });
      
      setMessage({ 
        text: `Reset-Link wurde an ${email} gesendet. Bitte überprüfe deine E-Mails.`, 
        type: "success" 
      });
    } catch (e: any) {
      setMessage({ 
        text: e.message || "Fehler beim Senden der E-Mail. Bitte versuche es erneut.", 
        type: "error" 
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Passwort zurücksetzen</title>
        <meta name="description" content="Setze dein Passwort zurück" />
      </Helmet>
      
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" /> 
              Passwort zurücksetzen
            </CardTitle>
            <CardDescription>
              {isValidResetLink 
                ? "Gib dein neues Passwort ein" 
                : "Fordere einen Reset-Link für deine E-Mail-Adresse an"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {message.text && (
              <Alert className={
                message.type === 'error' ? 'border-destructive' : 
                message.type === 'success' ? 'border-green-500' : 'border-blue-500'
              }>
                {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {isValidResetLink ? (
              // Password update form
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
                    minLength={6}
                    disabled={loading}
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
              // Reset email request form
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
            
            <div className="text-center">
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