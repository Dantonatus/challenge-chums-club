import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { Stats } from "@/components/profile/Stats";
import { TopChallenges } from "@/components/profile/TopChallenges";
import { ActivityFeed } from "@/components/profile/ActivityFeed";
import { useQuery } from "@tanstack/react-query";
import { formatEUR } from "@/lib/currency";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Trends } from "@/components/profile/Trends";

const dict = {
  de: {
    pageTitle: "Profil | Character Challenge",
    pageDesc: "Verwalte deinen vollständigen Namen und dein Profilbild.",
    header: "Dein Profil",
    profileInfo: "Profilinformationen",
    profileInfoDesc: "Vollständigen Namen festlegen und Profilbild ändern.",
    save: "Änderungen speichern",
    upload: "Neues Bild hochladen",
    stats: { active: "Aktive Challenges", violations30: "Verletzungen (30 Tage)", outstanding: "Offen gesamt" },
    top: { title: "Top-Challenges", empty: "Keine aktiven Challenges", open: "Öffnen", penalty: "Strafe/Verstoß" },
    feed: { title: "Aktivität", empty: "Noch keine Aktivitäten", youViolation: "Du hast eine Verletzung hinzugefügt in", joinedGroup: "ist deiner Gruppe beigetreten", someone: "Jemand", challenge: "Challenge" },
    charts: { barTitle: "Verstöße pro Teilnehmer", lineTitle: "Kumulative Strafen (€)", empty: "Keine Daten verfügbar" },
  },
  en: {
    pageTitle: "Profile | Character Challenge",
    pageDesc: "Manage your full name and profile picture.",
    header: "Your Profile",
    profileInfo: "Profile Information",
    profileInfoDesc: "Set full name and change profile picture.",
    save: "Save changes",
    upload: "Upload new image",
    stats: { active: "Active challenges", violations30: "Violations (30 days)", outstanding: "Outstanding total" },
    top: { title: "Top Challenges", empty: "No active challenges", open: "Open", penalty: "Penalty/violation" },
    feed: { title: "Activity", empty: "No activity yet", youViolation: "You added a violation in", joinedGroup: "joined your group", someone: "Someone", challenge: "Challenge" },
    charts: { barTitle: "Violations per participant", lineTitle: "Cumulative penalties (€)", empty: "No data available" },
  },
};

const ProfilePage = () => {
  const lang = (navigator.language?.startsWith("de") ? "de" : "en") as keyof typeof dict;
  const t = dict[lang];

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
    if (error) return toast({ title: lang === "de" ? "Speichern fehlgeschlagen" : "Save failed", description: error.message, variant: "destructive" as any });
    toast({ title: lang === "de" ? "Profil aktualisiert" : "Profile updated" });
  };

  const handleAvatarUploaded = async (url: string) => {
    setAvatarUrl(url);
    if (!userId) return;
    try {
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    } catch {}
  };

  const initials = (displayName || "").trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?";

  // Data for charts
  const today = new Date().toISOString().slice(0,10);
  const from30 = new Date(Date.now() - 30*24*60*60*1000).toISOString();

  const myParts = useQuery({
    enabled: !!userId,
    queryKey: ["profile","parts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("challenge_id, user_id, penalty_count")
        .eq("user_id", userId!);
      if (error) throw error;
      return data || [];
    }
  });

  const challengeIds = useMemo(() => Array.from(new Set((myParts.data||[]).map(p => p.challenge_id))), [myParts.data]);

  const activeCh = useQuery({
    enabled: challengeIds.length>0,
    queryKey: ["profile","active-ch", challengeIds.join(","), today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id,title,start_date,end_date")
        .in("id", challengeIds)
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data || [];
    }
  });

  const relevantChallengeId = useMemo(() => (activeCh.data||[])[0]?.id as string | undefined, [activeCh.data]);

  const relParticipants = useQuery({
    enabled: !!relevantChallengeId,
    queryKey: ["profile","rel-parts", relevantChallengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("user_id, penalty_count")
        .eq("challenge_id", relevantChallengeId!);
      if (error) throw error;
      return data || [];
    }
  });

  const relProfiles = useQuery({
    enabled: (relParticipants.data||[]).length>0,
    queryKey: ["profile","rel-profiles", (relParticipants.data||[]).length],
    queryFn: async () => {
      const ids = Array.from(new Set((relParticipants.data||[]).map(p => p.user_id)));
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      if (error) throw error;
      const map = new Map<string,string>();
      (data||[]).forEach(p => map.set(p.id, p.display_name || ""));
      return map;
    }
  });

  const barData = useMemo(() => {
    return (relParticipants.data||[]).map(p => ({
      name: relProfiles.data?.get(p.user_id) || p.user_id,
      count: p.penalty_count || 0,
    }));
  }, [relParticipants.data, relProfiles.data]);

  const myViolations = useQuery({
    enabled: !!userId,
    queryKey: ["profile","violations", userId, from30],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("created_at, amount_cents")
        .eq("user_id", userId!)
        .gte("created_at", from30)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const lineData = useMemo(() => {
    let sum = 0;
    return (myViolations.data||[]).map(v => {
      sum += v.amount_cents || 0;
      const date = new Date(v.created_at);
      const label = `${date.getMonth()+1}/${date.getDate()}`;
      return { date: label, total: (sum/100).toFixed(2) };
    });
  }, [myViolations.data]);

  return (
    <section>
      <Helmet>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDesc} />
        <link rel="canonical" href="/app/profile" />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{t.header}</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: profile card */}
        <Card>
          <CardHeader>
            <CardTitle>{t.profileInfo}</CardTitle>
            <CardDescription>{t.profileInfoDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                {userId ? (
                  <AvatarUploader userId={userId} onUploaded={handleAvatarUploaded} />
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    {t.upload}
                  </Button>
                )}
              </div>
              <div className="w-full max-w-sm mx-auto grid gap-3">
                <Input
                  placeholder={lang === "de" ? "Vollständiger Name" : "Full name"}
                  aria-label={lang === "de" ? "Vollständiger Name" : "Full name"}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <div className="flex justify-center">
                  <Button onClick={handleSave} disabled={loading}>{t.save}</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column: content */}
        <div className="md:col-span-2 grid gap-6">
          <Stats userId={userId || ""} t={t} />
          <div className="grid gap-6 md:grid-cols-2">
            <TopChallenges userId={userId || ""} t={t} />
            <Trends userId={userId || ""} t={t} />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t.charts.barTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                {activeCh.isLoading || relParticipants.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : barData.length ? (
                  <ChartContainer config={{ count: { label: "Count", color: "hsl(var(--primary))" } }}>
                    <BarChart data={barData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={60} angle={0} dy={10} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[6,6,0,0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="text-sm text-muted-foreground">{t.charts.empty}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.charts.lineTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                {myViolations.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : lineData.length ? (
                  <ChartContainer config={{ total: { label: "€", color: "hsl(var(--primary))" } }}>
                    <LineChart data={lineData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="text-sm text-muted-foreground">{t.charts.empty}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <ActivityFeed userId={userId || ""} t={t} />
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
