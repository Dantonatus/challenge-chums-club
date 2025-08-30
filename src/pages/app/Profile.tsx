import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { ColorPicker } from "@/components/profile/ColorPicker";
import { ProfileDateRangeSelector } from "@/components/profile/ProfileDateRangeSelector";
import { ProfileDashboardHeader } from "@/components/profile/ProfileDashboardHeader";
import { ProfileMetricCards } from "@/components/profile/ProfileMetricCards";
import { ProfileChartsSection } from "@/components/profile/ProfileChartsSection";
import { ProfileActivityFeed } from "@/components/profile/ProfileActivityFeed";
import { ActiveChallengeCards } from "@/components/profile/ActiveChallengeCards";
import { useQuery } from "@tanstack/react-query";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { eachWeekOfInterval, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

const dict = {
  de: {
    pageTitle: "Profil | Character Challenge",
    pageDesc: "Verwalte dein Profil und verfolge deine Herausforderungen mit detaillierten Analysen.",
    header: "Dein Profil",
    profileSettings: "Profil-Einstellungen",
    personalInfo: "Persönliche Informationen",
    personalInfoDesc: "Verwalte deinen Namen, dein Profilbild und deine persönliche Farbe.",
    analyticsInsights: "Analysen & Einblicke",
    save: "Änderungen speichern",
    upload: "Neues Bild hochladen",
    activeChallenges: "Aktive Challenges",
    engagement: "Engagement",
    discipline: "Disziplin",
    financialImpact: "Finanzielle Auswirkung",
    challengesViolationsTrend: "Challenges & Verstöße Trend",
    violationsPerParticipant: "Verstöße pro Teilnehmer",
    cumulativePenalties: "Kumulative Strafen (€)",
    activityFeed: "Aktivitätsfeed",
    noData: "Keine Daten verfügbar",
  },
  en: {
    pageTitle: "Profile | Character Challenge",
    pageDesc: "Manage your profile and track your challenges with detailed analytics.",
    header: "Your Profile",
    profileSettings: "Profile Settings",
    personalInfo: "Personal Information",
    personalInfoDesc: "Manage your name, profile picture, and personal color.",
    analyticsInsights: "Analytics & Insights",
    save: "Save changes",
    upload: "Upload new image",
    activeChallenges: "Active Challenges",
    engagement: "Engagement",
    discipline: "Discipline",
    financialImpact: "Financial Impact",
    challengesViolationsTrend: "Challenges & Violations Trend",
    violationsPerParticipant: "Violations per Participant",
    cumulativePenalties: "Cumulative Penalties (€)",
    activityFeed: "Activity Feed",
    noData: "No data available",
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

  // Date range state for analytics
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Default to last 30 days
    return { start: startOfDay(start), end: endOfDay(end) };
  });

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
    if (error) {
      return toast({ 
        title: lang === "de" ? "Speichern fehlgeschlagen" : "Save failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
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
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: lang === "de" ? "Farbe gespeichert" : "Color saved",
        description: lang === "de" ? "Deine Farbe wurde erfolgreich aktualisiert" : "Your color has been updated successfully"
      });
    }
  };

  const initials = (displayName || "").trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?";

  // Fetch all relevant data based on date range
  const { data: challengesData, isLoading: challengesLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["profile", "challenges", userId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          id, title, start_date, end_date, penalty_amount,
          challenge_participants!inner(user_id),
          challenge_violations(id, user_id, amount_cents, date),
          kpi_measurements(id, user_id, date, measured_value, target_value)
        `)
        .eq("challenge_participants.user_id", userId!)
        .gte("start_date", dateRange.start.toISOString().split('T')[0])
        .lte("end_date", dateRange.end.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (!challengesData) return null;

    const weeks = eachWeekOfInterval(
      { start: dateRange.start, end: dateRange.end },
      { weekStartsOn: 1 }
    );

    const weeklyData = weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const activeChallenges = challengesData.filter(c => 
        c.start_date <= weekEndStr && c.end_date >= weekStartStr
      );

      const participantsThisWeek = new Set(
        activeChallenges.flatMap(c => c.challenge_participants.map(p => p.user_id))
      );

      const violationsThisWeek = activeChallenges.flatMap(c =>
        (c.challenge_violations || []).filter(v => 
          v.date >= weekStartStr && v.date <= weekEndStr
        )
      );

      const missesThisWeek = activeChallenges.flatMap(c =>
        (c.kpi_measurements || []).filter(m => 
          m.date >= weekStartStr && m.date <= weekEndStr && 
          m.measured_value < m.target_value
        )
      );

      const penaltiesSum = [
        ...violationsThisWeek.map(v => v.amount_cents),
        ...missesThisWeek.map(m => {
          // Find the challenge for this KPI miss
          const challenge = activeChallenges.find(ch => 
            (ch.kpi_measurements || []).some(measurement => 
              measurement.id === m.id
            )
          );
          return challenge?.penalty_amount || 0;
        })
      ].reduce((sum, cents) => sum + (cents || 0), 0);

      return {
        weekStart,
        activeChallenges: activeChallenges.length,
        uniqueParticipants: participantsThisWeek.size,
        fails: violationsThisWeek.length + missesThisWeek.length,
        penalties: penaltiesSum / 100, // Convert to EUR
        engagedParticipants: participantsThisWeek.size,
      };
    });

    // Calculate aggregate metrics
    const totalParticipants = new Set(
      challengesData.flatMap(c => c.challenge_participants.map(p => p.user_id))
    ).size;

    const avgEngagedParticipants = weeklyData.reduce((sum, w) => sum + w.engagedParticipants, 0) / weeks.length;
    const engagementRate = totalParticipants > 0 ? (avgEngagedParticipants / totalParticipants) * 100 : 0;

    const totalFails = weeklyData.reduce((sum, w) => sum + w.fails, 0);
    const avgFailsPerParticipantWeek = totalParticipants > 0 && weeks.length > 0 
      ? totalFails / (totalParticipants * weeks.length) 
      : 0;

    const failThreshold = 1; // 1 fail per participant per week
    const disciplineScore = Math.max(0, 1 - avgFailsPerParticipantWeek / failThreshold);

    const totalPenalties = weeklyData.reduce((sum, w) => sum + w.penalties, 0);
    const avgPenaltyPerParticipantWeek = totalParticipants > 0 && weeks.length > 0 
      ? totalPenalties / (totalParticipants * weeks.length) 
      : 0;

    // Calculate deltas (current week vs previous weeks average)
    const currentWeek = weeklyData[weeklyData.length - 1];
    const previousWeeks = weeklyData.slice(0, -1);
    
    const avgPreviousEngagement = previousWeeks.length > 0 
      ? previousWeeks.reduce((sum, w) => sum + (w.engagedParticipants / totalParticipants * 100), 0) / previousWeeks.length
      : 0;
    
    const engagementDelta = avgPreviousEngagement > 0 
      ? ((engagementRate - avgPreviousEngagement) / avgPreviousEngagement) * 100 
      : 0;

    return {
      weeklyData,
      activeChallenges: challengesData.filter(c => 
        c.start_date <= dateRange.end.toISOString().split('T')[0] && 
        c.end_date >= dateRange.start.toISOString().split('T')[0]
      ).length,
      totalViolations: totalFails,
      totalPenalties,
      engagementRate,
      disciplineScore,
      avgPenaltyPerParticipantWeek,
      engagementDelta,
      currentWeek,
      previousWeeks,
    };
  }, [challengesData, dateRange]);

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Helmet>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDesc} />
        <link rel="canonical" href="/app/profile" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t.header}
          </h1>
        </header>

        <DateRangeProvider userId={userId}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Personal Settings */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{t.personalInfo}</CardTitle>
                  <CardDescription>{t.personalInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                        <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                        <AvatarFallback className="text-lg font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {customColor && (
                        <div 
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background"
                          style={{ backgroundColor: customColor }}
                        />
                      )}
                    </div>
                    
                    {userId && (
                      <AvatarUploader 
                        userId={userId} 
                        onUploaded={handleAvatarUploaded}
                        label={t.upload}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <Input
                      placeholder={lang === "de" ? "Vollständiger Name" : "Full name"}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="text-center text-lg"
                    />
                    
                    <Button 
                      onClick={handleSave} 
                      disabled={loading}
                      className="w-full"
                      size="lg"
                    >
                      {t.save}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <ColorPicker
                selectedColor={customColor}
                onColorSelect={setCustomColor}
                onSave={handleColorSave}
                loading={colorLoading}
              />
            </div>

            {/* Right Column - Analytics & Insights */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-gradient-to-r from-card to-muted/10 border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">{t.analyticsInsights}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfileDateRangeSelector 
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </CardContent>
              </Card>

              {/* Dashboard Header with Statistics */}
              <ProfileDashboardHeader 
                analyticsData={analyticsData}
                loading={challengesLoading}
                t={t}
              />

              {/* Active Challenges Section */}
              <ActiveChallengeCards 
                challengesData={challengesData}
                dateRange={dateRange}
                loading={challengesLoading}
                t={t}
              />

              {/* Metric Cards */}
              <ProfileMetricCards 
                analyticsData={analyticsData}
                loading={challengesLoading}
                t={t}
              />

              {/* Charts Section */}
              <ProfileChartsSection 
                challengesData={challengesData}
                analyticsData={analyticsData}
                dateRange={dateRange}
                loading={challengesLoading}
                t={t}
              />

              {/* Activity Feed */}
              <ProfileActivityFeed 
                userId={userId}
                dateRange={dateRange}
                t={t}
              />
            </div>
          </div>
        </DateRangeProvider>
      </div>
    </section>
  );
};

export default ProfilePage;