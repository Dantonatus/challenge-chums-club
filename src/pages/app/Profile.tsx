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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Trends } from "@/components/profile/Trends";
import CumulativePenaltyChart from "@/components/challenges/CumulativePenaltyChart";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { DateRangeBar } from "@/components/profile/DateRangeBar";
import ViolationsPerParticipant from "@/components/profile/ViolationsPerParticipant";
import { ColorPicker } from "@/components/profile/ColorPicker";
import { KPIAnalytics } from "@/components/profile/KPIAnalytics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target, Calendar, Clock, Zap, Trophy } from "lucide-react";
import { useDateRange } from "@/contexts/DateRangeContext";

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
    charts: { 
      barTitle: "Verstöße pro Teilnehmer", 
      lineTitle: "Kumulative Strafen (€)", 
      trendsCountsTitle: "Challenges & Verstöße (Zeitraum)", 
      challengesLabel: "Challenges", 
      violationsLabel: "Verstöße", 
      empty: "Keine Daten verfügbar",
      noDataMessage: "Keine Daten im ausgewählten Zeitraum",
      successRate: "Erfolgsrate",
      streakLength: "Aktuelle Serie",
      avgPerformance: "Durchschnittsleistung",
      personalBest: "Persönliche Bestleistung"
    },
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
    charts: { 
      barTitle: "Violations per participant", 
      lineTitle: "Cumulative penalties (€)", 
      trendsCountsTitle: "Challenges & Violations (Period)", 
      challengesLabel: "Challenges", 
      violationsLabel: "Violations", 
      empty: "No data available",
      noDataMessage: "No data available for selected period",
      successRate: "Success Rate",
      streakLength: "Current Streak",
      avgPerformance: "Average Performance",
      personalBest: "Personal Best"
    },
  },
};

const ProfilePage = () => {
  const lang = (navigator.language?.startsWith("de") ? "de" : "en") as keyof typeof dict;
  const t = dict[lang];

  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [customColor, setCustomColor] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [colorLoading, setColorLoading] = useState(false);

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
        .select("display_name, avatar_url, custom_color")
        .eq("id", id)
        .maybeSingle();
      setDisplayName(data?.display_name || "");
      setAvatarUrl(data?.avatar_url || "");
      setCustomColor(data?.custom_color || "");
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

  const handleColorSave = async () => {
    if (!userId || !customColor) return;
    setColorLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ custom_color: customColor })
      .eq("id", userId);
    setColorLoading(false);
    if (error) {
      toast({ 
        title: lang === "de" ? "Farbe speichern fehlgeschlagen" : "Color save failed", 
        description: error.message, 
        variant: "destructive" as any 
      });
    } else {
      toast({ 
        title: lang === "de" ? "Farbe gespeichert" : "Color saved",
        description: lang === "de" ? "Deine Farbe wurde erfolgreich aktualisiert" : "Your color has been updated successfully"
      });
    }
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
        .select("id, display_name, custom_color")
        .in("id", ids);
      if (error) throw error;
      const map = new Map<string,{name: string, color?: string}>();
      (data||[]).forEach(p => map.set(p.id, { name: p.display_name || "", color: p.custom_color }));
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
      name: relProfiles.data?.get(p.user_id)?.name || p.user_id,
      amount: Math.round(((sums.get(p.user_id) || 0) / 100) * 100) / 100,
    }));
  }, [relViolations.data, relParticipants.data, relProfiles.data]);


  // Participants with names and colors for the cumulative chart
  const chartParticipants = useMemo(() => {
    return (relParticipants.data || []).map((p: any) => {
      const profile = relProfiles.data?.get(p.user_id);
      return {
        user_id: p.user_id,
        name: profile?.name || p.user_id,
        custom_color: profile?.color,
      };
    });
  }, [relParticipants.data, relProfiles.data]);

  // Default range: last 6 months up to today
  // Enhanced analytics with new insights
  const enhancedAnalytics = useQuery({
    enabled: !!userId,
    queryKey: ["enhanced-analytics", userId],
    queryFn: async () => {
      // Get user's logs for success rate calculation
      const { data: logs } = await supabase
        .from("logs")
        .select("success, date, challenge_id")
        .eq("user_id", userId!);

      // Get user's violations for streak analysis
      const { data: violations } = await supabase
        .from("challenge_violations")
        .select("created_at, challenge_id")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      return { logs: logs || [], violations: violations || [] };
    }
  });

  // Calculate new metrics
  const personalMetrics = useMemo(() => {
    if (!enhancedAnalytics.data) return null;
    
    const { logs, violations } = enhancedAnalytics.data;
    
    // Success rate calculation
    const totalLogs = logs.length;
    const successfulLogs = logs.filter(log => log.success).length;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;
    
    // Current streak calculation (days without violations)
    const today = new Date();
    let streakDays = 0;
    if (violations.length === 0) {
      // No violations ever - count from first log date
      const firstLog = logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      if (firstLog) {
        const daysDiff = Math.floor((today.getTime() - new Date(firstLog.date).getTime()) / (1000 * 60 * 60 * 24));
        streakDays = Math.max(0, daysDiff);
      }
    } else {
      // Calculate days since last violation
      const lastViolation = new Date(violations[0].created_at);
      const daysDiff = Math.floor((today.getTime() - lastViolation.getTime()) / (1000 * 60 * 60 * 24));
      streakDays = Math.max(0, daysDiff);
    }
    
    return { successRate, streakDays };
  }, [enhancedAnalytics.data]);

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Helmet>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDesc} />
        <link rel="canonical" href="/app/profile" />
      </Helmet>

      <header className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
        >
          {t.header}
        </motion.h1>
      </header>

      <DateRangeProvider userId={userId}>
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Left column: Profile settings */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    👤
                  </motion.div>
                  {t.profileInfo}
                </CardTitle>
                <CardDescription>{t.profileInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                      <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                      <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                  </motion.div>
                  
                  <div className="w-full space-y-4">
                    {userId ? (
                      <AvatarUploader userId={userId} onUploaded={handleAvatarUploaded} />
                    ) : (
                      <Button type="button" variant="outline" size="sm" disabled>
                        {t.upload}
                      </Button>
                    )}
                    
                    <Input
                      placeholder={lang === "de" ? "Vollständiger Name" : "Full name"}
                      aria-label={lang === "de" ? "Vollständiger Name" : "Full name"}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="text-center"
                    />
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? "Saving..." : t.save}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ColorPicker
              selectedColor={customColor}
              onColorSelect={setCustomColor}
              onSave={handleColorSave}
              loading={colorLoading}
            />

            {/* Personal Metrics Cards */}
            {personalMetrics && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <Card className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">{t.charts.successRate}</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {personalMetrics.successRate.toFixed(1)}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{t.charts.streakLength}</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {personalMetrics.streakDays} {personalMetrics.streakDays === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                      <Zap className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Right column: Analytics */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-8"
          >
            <DateRangeBar />
            <Stats userId={userId || ""} t={t} />
            
            {/* Enhanced Analytics Tabs */}
            <Tabs defaultValue="habit" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="habit" className="rounded-lg">📊 Habit Analytics</TabsTrigger>
                <TabsTrigger value="kpi" className="rounded-lg">🎯 KPI Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="habit" className="space-y-6 mt-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <TopChallenges userId={userId || ""} t={t} />
                  
                  {/* Enhanced Trends with better height */}
                  <Card className="rounded-xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {t.charts.trendsCountsTitle}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <Trends userId={userId || ""} t={t} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Enhanced Violations chart */}
                  <Card className="rounded-xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        {t.charts.barTitle}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        {(!relevantChallengeId || relParticipants.isLoading || relProfiles.isLoading) ? (
                          <div className="flex items-center justify-center h-full">
                            <Skeleton className="h-full w-full" />
                          </div>
                        ) : chartParticipants.length ? (
                          <ViolationsPerParticipant
                            challengeId={relevantChallengeId}
                            participants={chartParticipants}
                          />
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-muted-foreground"
                          >
                            <Calendar className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-center">{t.charts.noDataMessage}</p>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enhanced Cumulative Penalties chart */}
                  <Card className="rounded-xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        {t.charts.lineTitle}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        {(!relevantChallengeId || relParticipants.isLoading || relProfiles.isLoading) ? (
                          <div className="flex items-center justify-center h-full">
                            <Skeleton className="h-full w-full" />
                          </div>
                        ) : chartParticipants.length ? (
                          <CumulativePenaltyChart
                            challengeId={relevantChallengeId}
                            participants={chartParticipants}
                          />
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-muted-foreground"
                          >
                            <Clock className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-center">{t.charts.noDataMessage}</p>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="kpi" className="space-y-6 mt-6">
                {userId && <KPIAnalytics userId={userId} />}
              </TabsContent>
            </Tabs>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ActivityFeed userId={userId || ""} t={t} />
            </motion.div>
          </motion.div>
        </div>
      </DateRangeProvider>
    </section>
  );
};

export default ProfilePage;
