import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Sparkles, ArrowRight, Calendar, Target } from "lucide-react";

// New habit-focused components
import { useHabitStats } from "@/hooks/useHabitStats";
import { HabitStreakCards } from "@/components/summary/HabitStreakCards";
import { WeeklyHeatmap } from "@/components/summary/WeeklyHeatmap";
import { CompletionRings } from "@/components/summary/CompletionRings";
import { MotivationalInsights } from "@/components/summary/MotivationalInsights";

// Keep some existing components
import { GlobalBar } from "@/components/summary/GlobalBar";
import { FilterBar } from "@/components/summary/FilterBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Summary = () => {
  const { start, end } = useDateRange();
  const lang = navigator.language.startsWith('de') ? 'de' : 'en';
  const locale = lang === 'de' ? de : enUS;

  // New habit stats hook - connected to logs table
  const { habitStats, overallStats, isLoading } = useHabitStats();

  // Filter state (simplified)
  const [filters, setFilters] = useState({
    participants: [] as string[],
    challengeTypes: [] as string[],
    groups: [] as string[]
  });

  const t = {
    de: {
      title: "Dein Habit-Dashboard",
      description: "Verfolge deine Fortschritte und bleibe motiviert",
      streakSection: "Deine Streaks",
      weeklySection: "Diese Woche",
      progressSection: "Fortschritt",
      loadingAnimation: "Lade deine Habits...",
      emptyState: "Starte deine erste Habit-Challenge!",
      createChallenge: "Habit erstellen",
      goToEntry: "Jetzt eintragen",
      greeting: "Willkommen zurück!",
      statsTitle: "Deine Statistiken",
    },
    en: {
      title: "Your Habit Dashboard",
      description: "Track your progress and stay motivated",
      streakSection: "Your Streaks",
      weeklySection: "This Week",
      progressSection: "Progress",
      loadingAnimation: "Loading your habits...",
      emptyState: "Start your first habit challenge!",
      createChallenge: "Create Habit",
      goToEntry: "Log Now",
      greeting: "Welcome back!",
      statsTitle: "Your Statistics",
    }
  };

  // Fetch filter options (groups for filtering)
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      try {
        const { data: userGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (!userGroups || userGroups.length === 0) {
          return { participants: [], groups: [] };
        }

        const groupIds = userGroups.map(g => g.group_id);

        const { data: groups } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds);

        return {
          participants: [],
          groups: groups || []
        };
      } catch (error) {
        console.error('Error fetching filter options:', error);
        return { participants: [], groups: [] };
      }
    }
  });

  const handleFilterChange = {
    participants: (participants: string[]) => setFilters(prev => ({ ...prev, participants })),
    challengeTypes: (challengeTypes: string[]) => setFilters(prev => ({ ...prev, challengeTypes })),
    groups: (groups: string[]) => setFilters(prev => ({ ...prev, groups })),
    clearAll: () => setFilters({ participants: [], challengeTypes: [], groups: [] })
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Helmet>
          <title>{t[lang].title}</title>
          <meta name="description" content={t[lang].description} />
        </Helmet>
        <div className="space-y-4 px-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 animate-pulse text-primary" />
            <div className="h-8 bg-muted rounded animate-pulse flex-1" />
          </div>
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center text-muted-foreground animate-pulse">
          {t[lang].loadingAnimation}
        </div>
      </div>
    );
  }

  // Check if user has no habits
  const hasNoHabits = !habitStats || habitStats.length === 0;

  return (
    <div className="animate-fade-in">
      <Helmet>
        <title>{t[lang].title}</title>
        <meta name="description" content={t[lang].description} />
      </Helmet>

      {/* Global Bar - Sticky Header */}
      <GlobalBar
        lang={lang}
        compareMode={false}
        onCompareToggle={() => {}}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Main Content */}
      <div className="px-6 space-y-8 pb-8">
        {/* Header Section */}
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {t[lang].greeting}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {t[lang].description}
          </p>
        </div>

        {hasNoHabits ? (
          /* Empty State - No Habits */
          <Card className="animate-scale-in border-0 bg-gradient-to-br from-background/80 to-muted/20 shadow-sm">
            <CardContent className="pt-6 text-center py-16">
              <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                <div className="relative">
                  <div className="text-7xl mb-2">🌱</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-full blur-xl" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-foreground">{t[lang].emptyState}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {lang === 'de' 
                      ? "Erstelle dein erstes Habit und beginne deine Reise zu besseren Gewohnheiten."
                      : "Create your first habit and start your journey to better routines."
                    }
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    asChild 
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link to="/app/challenges" className="gap-2">
                      {t[lang].createChallenge}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Habit Dashboard Content */
          <>
            {/* Section 1: Streak Cards */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  🔥 {t[lang].streakSection}
                </h2>
              </div>
              <HabitStreakCards 
                habits={habitStats.map(h => ({
                  challengeId: h.challengeId,
                  title: h.title,
                  currentStreak: h.currentStreak,
                  longestStreak: h.longestStreak,
                  successRate: h.successRate,
                }))} 
                lang={lang} 
              />
            </section>

            {/* Section 2: Weekly Overview + Insights */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Heatmap - spans 2 columns */}
              <div className="lg:col-span-2">
                <WeeklyHeatmap 
                  habitStats={habitStats.map(h => ({
                    challengeId: h.challengeId,
                    title: h.title,
                    lastSevenDays: h.lastSevenDays,
                  }))} 
                  lang={lang}
                  weeksToShow={4}
                />
              </div>

              {/* Motivational Insights - spans 1 column */}
              <div className="lg:col-span-1">
                <MotivationalInsights 
                  overallStats={overallStats}
                  habitStats={habitStats.map(h => ({
                    challengeId: h.challengeId,
                    title: h.title,
                    successRate: h.successRate,
                    currentStreak: h.currentStreak,
                  }))}
                  lang={lang}
                />
              </div>
            </section>

            {/* Section 3: Completion Rings */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  📊 {t[lang].progressSection}
                </h2>
              </div>
              <CompletionRings 
                habits={habitStats.map(h => ({
                  challengeId: h.challengeId,
                  title: h.title,
                  successRate: h.successRate,
                  totalEntries: h.totalEntries,
                  successfulEntries: h.successfulEntries,
                }))}
                lang={lang}
              />
            </section>

            {/* Quick Action: Go to Entry */}
            <div className="flex justify-center pt-4">
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/app/entry">
                  <Calendar className="h-4 w-4" />
                  {t[lang].goToEntry}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Summary;
