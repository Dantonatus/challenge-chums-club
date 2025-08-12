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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Trends } from "@/components/profile/Trends";
import CumulativePenaltyChart from "@/components/challenges/CumulativePenaltyChart";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { DateRangeBar } from "@/components/profile/DateRangeBar";
import ViolationsPerParticipant from "@/components/profile/ViolationsPerParticipant";

const dict = {
  de: {
    pageTitle: "Profil | Character Challenge",
    pageDesc: "Verwalte deinen vollständigen Namen und dein Profilbild.",
    header: "Dein Profil",
    profileInfo: "Profilinformationen",
    profileInfoDesc: "Vollständigen Namen festlegen und Profilbild ändern.",
    save: "Änderungen speichern",
    upload: "Neues Bild hochladen",
    stats: { active: "Aktive Challenges", violations30: "Verletzungen", outstanding: "Offen gesamt" },
    top: { title: "Top-Challenges", empty: "Keine aktiven Challenges", open: "Öffnen", penalty: "Strafe/Verstoß" },
    feed: { title: "Aktivität", empty: "Noch keine Aktivitäten", youViolation: "Du hast eine Verletzung hinzugefügt in", joinedGroup: "ist deiner Gruppe beigetreten", someone: "Jemand", challenge: "Challenge" },
    charts: { barTitle: "Verstöße pro Teilnehmer", lineTitle: "Kumulative Strafen (€)", trendsCountsTitle: "Challenges & Verstöße (Zeitraum)", challengesLabel: "Challenges", violationsLabel: "Verstöße", empty: "Keine Daten verfügbar" },
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
    charts: { barTitle: "Violations per participant", lineTitle: "Cumulative penalties (€)", trendsCountsTitle: "Challenges & Violations (6 months)", challengesLabel: "Challenges", violationsLabel: "Violations", empty: "No data available" },
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

  const today = new Date().toISOString().slice(0,10);

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

  const relViolations = useQuery({
    enabled: !!relevantChallengeId,
    queryKey: ["profile","rel-violations", relevantChallengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("user_id, amount_cents")
        .eq("challenge_id", relevantChallengeId!);
      if (error) throw error;
      return data || [];
    }
  });

  const barData = useMemo(() => {
    // Sum all violation amounts per user for the relevant challenge, up to today
    const sums = new Map<string, number>();
    (relViolations.data || []).forEach((v: any) => {
      const cents = v.amount_cents || 0;
      sums.set(v.user_id, (sums.get(v.user_id) || 0) + cents);
    });
    // Include participants with 0€ as well for completeness
    return (relParticipants.data || []).map((p: any) => ({
      name: relProfiles.data?.get(p.user_id) || p.user_id,
      amount: Math.round(((sums.get(p.user_id) || 0) / 100) * 100) / 100,
    }));
  }, [relViolations.data, relParticipants.data, relProfiles.data]);


  // Participants with names for the cumulative chart
  const chartParticipants = useMemo(() => {
    return (relParticipants.data || []).map((p: any) => ({
      user_id: p.user_id,
      name: relProfiles.data?.get(p.user_id) || p.user_id,
    }));
  }, [relParticipants.data, relProfiles.data]);

  // Default range: last 6 months up to today
  const sixEnd = new Date();
  const sixStart = new Date(sixEnd);
  sixStart.setMonth(sixStart.getMonth() - 6);

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

      <DateRangeProvider userId={userId}>

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
          <DateRangeBar />
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
                {(!relevantChallengeId || relParticipants.isLoading || relProfiles.isLoading) ? (
                  <Skeleton className="h-48 w-full" />
                ) : chartParticipants.length ? (
                  <ViolationsPerParticipant
                    challengeId={relevantChallengeId}
                    participants={chartParticipants}
                  />
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
                {(!relevantChallengeId || relParticipants.isLoading || relProfiles.isLoading) ? (
                  <Skeleton className="h-56 w-full" />
                ) : chartParticipants.length ? (
                  <CumulativePenaltyChart
                    challengeId={relevantChallengeId}
                    participants={chartParticipants}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">{t.charts.empty}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <ActivityFeed userId={userId || ""} t={t} />
        </div>
      </div>
    </DateRangeProvider>
  </section>
  );
};

export default ProfilePage;
