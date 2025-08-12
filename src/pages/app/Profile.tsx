import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUploader } from "@/components/profile/AvatarUploader";

const ProfilePage = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id ?? null;
      setUserId(id);
      if (!id) return;

      // Ensure profile exists, then load it
      try {
        await supabase.from("profiles").insert({ id }).select("id").maybeSingle();
      } catch (_) {}
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", id)
        .maybeSingle();
      setDisplayName(data?.display_name || "");
      setAvatarUrl(data?.avatar_url || "");
    };
    init();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null, avatar_url: avatarUrl || null })
      .eq("id", userId);
    setLoading(false);
    if (error) return toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" as any });
    toast({ title: "Profil aktualisiert" });
  };

  const handleAvatarUploaded = async (url: string) => {
    setAvatarUrl(url);
    if (!userId) return;
    try {
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    } catch {}
  };

  const initials = (displayName || "").trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <section>
      <Helmet>
        <title>Profil | Character Challenge</title>
        <meta name="description" content="Verwalte deinen vollständigen Namen und dein Profilbild." />
        <link rel="canonical" href="/app/profile" />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dein Profil</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profilinformationen</CardTitle>
          <CardDescription>Vollständigen Namen festlegen und Profilbild ändern.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} alt="Profilbild" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                {userId ? (
                  <AvatarUploader userId={userId} onUploaded={handleAvatarUploaded} />
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    Neues Bild hochladen
                  </Button>
                )}
              </div>
            </div>
            <div className="md:col-span-2 grid gap-3">
              <Input
                placeholder="Vollständiger Name"
                aria-label="Vollständiger Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div>
                <Button onClick={handleSave} disabled={loading}>Änderungen speichern</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default ProfilePage;
