import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock } from "lucide-react";
import { Helmet } from "react-helmet-async";

function useHashParams() {
  const { hash, search } = useLocation();
  return useMemo(() => {
    // Supabase may use hash fragment for tokens; also support query params
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const q = new URLSearchParams(search);
    const get = (key: string) => params.get(key) || q.get(key);
    return {
      type: get("type"),
      access_token: get("access_token"),
      refresh_token: get("refresh_token"),
      error: get("error"),
    };
  }, [hash, search]);
}

const PasswordReset = () => {
  const navigate = useNavigate();
  const { type, error } = useHashParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"error" | "success" | "info">("info");

  // Ensure session is initialized when redirected from email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // nothing, we only need the client to pick tokens from URL
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (error) {
      setMsg(`Fehler bei der Anmeldung: ${error}`);
      setMsgType("error");
    } else if (type !== "recovery") {
      setMsg("Ungültiger oder abgelaufener Link. Bitte fordere erneut einen Reset an.");
      setMsgType("error");
    }
  }, [type, error]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setMsg("Passwort muss mind. 6 Zeichen haben.");
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
      setMsg("Passwort aktualisiert. Du kannst dich jetzt anmelden.");
      setMsgType("success");
      setTimeout(() => navigate("/auth"), 1200);
    } catch (e: any) {
      setMsg(e?.message || "Aktualisierung fehlgeschlagen.");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Passwort zurücksetzen – Sicherer Zugriff</title>
        <meta name="description" content="Setze dein Passwort sicher zurück." />
        <link rel="canonical" href={`${window.location.origin}/auth/reset`} />
      </Helmet>
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Passwort zurücksetzen</CardTitle>
            <CardDescription>
              {type === "recovery" ? "Bitte neues Passwort vergeben." : "Der Link ist ungültig oder abgelaufen."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {msg && (
              <Alert className={msgType === 'error' ? 'border-destructive' : msgType === 'success' ? 'border-green-500' : 'border-blue-500'}>
                <AlertDescription>{msg}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pass">Neues Passwort</Label>
                <Input id="new-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pass">Passwort bestätigen</Label>
                <Input id="confirm-pass" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading || type !== 'recovery'}>
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Speichern…</>) : "Passwort speichern"}
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => navigate('/auth')}>
                Zurück zum Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;
