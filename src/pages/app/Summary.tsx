import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDateRange } from "@/contexts/DateRangeContext";
import { formatEUR } from "@/lib/currency";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Calendar, Users, TrendingUp, Target, Sparkles } from "lucide-react";
import { Timeline } from "@/components/summary/Timeline";
import { FilterBar } from "@/components/summary/FilterBar";
import { ParticipantRanking } from "@/components/summary/ParticipantRanking";
import { ToughestVsEasiestChallenges } from "@/components/summary/ToughestVsEasiestChallenges";
import { BiggestMoneyBurners } from "@/components/summary/BiggestMoneyBurners";
import { MostPopularChallenges } from "@/components/summary/MostPopularChallenges";
import { StreakBreakers } from "@/components/summary/StreakBreakers";
import { BestROIChallenges } from "@/components/summary/BestROIChallenges";
import { ExportButton } from "@/components/summary/ExportButton";
import { WeeklyTimeline } from "@/components/summary/WeeklyTimeline";
import { FailsTrendPremium } from "@/components/summary/FailsTrendPremium";
import { GlobalBar } from "@/components/summary/GlobalBar";
import { KPIStrip } from "@/components/summary/KPIStrip";

const Summary = () => {
  const { start, end } = useDateRange();
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');
  const lang = navigator.language.startsWith('de') ? 'de' : 'en';
  const locale = lang === 'de' ? de : enUS;
  
  // Filter state
  const [filters, setFilters] = useState({
    participants: [] as string[],
    challengeTypes: [] as string[],
    groups: [] as string[]
  });

  // Global bar state
  const [compareMode, setCompareMode] = useState(false);
  const [compareParticipants, setCompareParticipants] = useState<[string, string] | null>(null);

  const t = {
    de: {
      title: "Übersicht",
      description: "Überblick über alle Challenges im gewählten Zeitraum",
      totalChallenges: "Challenges gesamt",
      totalParticipants: "Teilnehmer",
      totalPenalties: "Gesamtstrafen",
      weeklyOverview: "Wöchentliche Übersicht",
      challengesList: "Alle Challenges",
      participants: "Teilnehmer",
      penalties: "Strafen",
      viewDetails: "Details ansehen",
      habit: "Habit",
      kpi: "KPI",
      period: "Zeitraum",
      noChallenges: "Keine Challenges im gewählten Zeitraum gefunden.",
      loadingAnimation: "Lade Übersicht...",
      emptyState: "Noch keine Challenges – starte eine neue!",
      createChallenge: "Challenge erstellen"
    },
    en: {
      title: "Summary",
      description: "Overview of all challenges in the selected time period",
      totalChallenges: "Total Challenges",
      totalParticipants: "Participants",
      totalPenalties: "Total Penalties",
      weeklyOverview: "Weekly Overview",
      challengesList: "All Challenges",
      participants: "Participants",
      penalties: "Penalties",
      viewDetails: "View Details",
      habit: "Habit",
      kpi: "KPI",
      period: "Period",
      noChallenges: "No challenges found in the selected time period.",
      loadingAnimation: "Loading overview...",
      emptyState: "No challenges yet – create a new one!",
      createChallenge: "Create Challenge"
    }
  };

  // Fetch all available participants and groups for filters
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      try {
        // Get all groups the user is a member of
        const { data: userGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (!userGroups || userGroups.length === 0) {
          return { participants: [], groups: [] };
        }

        const groupIds = userGroups.map(g => g.group_id);

        // Get all challenges from these groups (current and past)
        const { data: allChallenges } = await supabase
          .from('challenges')
          .select('id, group_id')
          .in('group_id', groupIds);

        if (!allChallenges || allChallenges.length === 0) {
          return { participants: [], groups: [] };
        }

        const challengeIds = allChallenges.map(c => c.id);

// Get all participants from these challenges (distinct user IDs)
const { data: allParticipantsRaw } = await supabase
  .from('challenge_participants')
  .select('user_id')
  .in('challenge_id', challengeIds);

// Resolve profiles for those user IDs
const userIds = Array.from(new Set((allParticipantsRaw || []).map(p => p.user_id)));
let participantProfiles: Array<{ id: string; display_name: string | null }> = [];
if (userIds.length > 0) {
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  participantProfiles = profs || [];
}

// Get group info
const { data: groups } = await supabase
  .from('groups')
  .select('id, name')
  .in('id', groupIds);

// Build participant list with display names
const uniqueParticipants = participantProfiles.map((p) => ({
  user_id: p.id,
  display_name: p.display_name || 'Unknown'
}));

return {
  participants: uniqueParticipants,
  groups: groups || []
};
      } catch (error) {
        console.error('Error fetching filter options:', error);
        return { participants: [], groups: [] };
      }
    }
  });

  // Fetch challenges with participants and violations data (with filters applied)
  const { data: challengesData, isLoading } = useQuery({
    queryKey: ['challenges-summary', start, end, filters],
    queryFn: async () => {
      // Build base query for challenges that overlap with the date range
      let challengesQuery = supabase
        .from('challenges')
        .select(`
          id,
          title,
          challenge_type,
          start_date,
          end_date,
          penalty_amount,
          description,
          group_id,
          kpi_definitions!inner(
            id,
            kpi_type,
            target_value,
            unit
          )
        `)
.lte('start_date', endStr)
        .gte('end_date', startStr);

      // Apply challenge type filter
      if (filters.challengeTypes.length > 0) {
        challengesQuery = challengesQuery.in('challenge_type', filters.challengeTypes);
      }

      // Apply group filter
      if (filters.groups.length > 0) {
        challengesQuery = challengesQuery.in('group_id', filters.groups);
      }

      const { data: challenges, error: challengesError } = await challengesQuery;
      if (challengesError) throw challengesError;

      // Also fetch habit challenges (those without KPI definitions)
      let habitQuery = supabase
        .from('challenges')
        .select(`
          id,
          title,
          challenge_type,
          start_date,
          end_date,
          penalty_amount,
          description,
          group_id
        `)
        .eq('challenge_type', 'habit')
.lte('start_date', endStr)
        .gte('end_date', startStr);

      // Apply challenge type filter
      if (filters.challengeTypes.length > 0 && !filters.challengeTypes.includes('habit')) {
        habitQuery = habitQuery.limit(0); // Don't fetch if habit not in filter
      }

      // Apply group filter
      if (filters.groups.length > 0) {
        habitQuery = habitQuery.in('group_id', filters.groups);
      }

      const { data: habitChallenges, error: habitError } = await habitQuery;
      if (habitError) throw habitError;

      // Combine all challenges
      const allChallenges = [
        ...(challenges || []).map(c => ({ ...c, hasKpi: true })),
        ...(habitChallenges || []).map(c => ({ ...c, hasKpi: false, kpi_definitions: [] }))
      ];

      // Remove duplicates by id
      const uniqueChallenges = allChallenges.filter((challenge, index, self) => 
        index === self.findIndex(c => c.id === challenge.id)
      );

      if (uniqueChallenges.length === 0) {
        return {
          challenges: [],
          stats: {
            totalChallenges: 0,
            uniqueParticipants: 0,
            totalPenalties: 0
          }
        };
      }

      // Fetch participants for each challenge
      const challengeIds = uniqueChallenges.map(c => c.id);
let participantsQuery = supabase
        .from('challenge_participants')
        .select('challenge_id, user_id')
        .in('challenge_id', challengeIds);

      // Apply participant filter
      if (filters.participants.length > 0) {
        participantsQuery = participantsQuery.in('user_id', filters.participants);
      }

      const { data: participantsRaw, error: participantsError } = await participantsQuery;
      if (participantsError) throw participantsError;

      // Build profile map for participant names
      const participantUserIds = Array.from(new Set((participantsRaw || []).map(p => p.user_id)));
      let profilesMap: Record<string, string> = {};
      if (participantUserIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', participantUserIds);
        profilesMap = Object.fromEntries((profs || []).map(p => [p.id, p.display_name || 'Unknown']));
      }

      // Fetch violations for each challenge
      let violationsQuery = supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, amount_cents, created_at')
        .in('challenge_id', challengeIds)
.gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`);

      // Apply participant filter
      if (filters.participants.length > 0) {
        violationsQuery = violationsQuery.in('user_id', filters.participants);
      }

      const { data: violations, error: violationsError } = await violationsQuery;
      if (violationsError) throw violationsError;

      // Fetch KPI measurements for KPI challenges
      const kpiChallengeIds = uniqueChallenges
        .filter(c => c.challenge_type === 'kpi')
        .map(c => c.id);

      let kpiMeasurements: any[] = [];
      if (kpiChallengeIds.length > 0) {
        let kpiQuery = supabase
          .from('kpi_measurements')
          .select(`
            kpi_definition_id,
            user_id,
            measured_value,
            measurement_date,
            kpi_definitions!inner(
              challenge_id,
              target_value
            )
          `)
.gte('measurement_date', startStr)
          .lte('measurement_date', endStr);

        // Apply participant filter
        if (filters.participants.length > 0) {
          kpiQuery = kpiQuery.in('user_id', filters.participants);
        }

        const { data: kpiData, error: kpiError } = await kpiQuery;
        if (kpiError) throw kpiError;
        kpiMeasurements = kpiData || [];
      }

      // Process data for each challenge
      const processedChallenges = uniqueChallenges.map(challenge => {
const challengeParticipants = (participantsRaw || [])
          .filter(p => p.challenge_id === challenge.id)
          .map(p => ({
            user_id: p.user_id,
            display_name: profilesMap[p.user_id] || 'Unknown'
          }));

        const challengeViolations = (violations || [])
          .filter(v => v.challenge_id === challenge.id)
          .map(v => ({
            date: format(new Date(v.created_at), 'yyyy-MM-dd'),
            user_id: v.user_id,
            amount_cents: v.amount_cents
          }));

        let challengeKpiMeasurements: any[] = [];
        if (challenge.challenge_type === 'kpi') {
          challengeKpiMeasurements = kpiMeasurements
            .filter(m => (m.kpi_definitions as any).challenge_id === challenge.id)
            .map(m => ({
              date: m.measurement_date,
              user_id: m.user_id,
              measured_value: m.measured_value,
              target_value: (m.kpi_definitions as any).target_value
            }));
        }

        return {
          id: challenge.id,
          title: challenge.title,
          challenge_type: challenge.challenge_type,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          penalty_amount: challenge.penalty_amount,
          description: challenge.description,
          participants: challengeParticipants,
          violations: challengeViolations,
          kpi_measurements: challengeKpiMeasurements,
          participantCount: challengeParticipants.length,
          totalViolationAmount: challengeViolations.reduce((sum, v) => sum + v.amount_cents, 0),
          violationCount: challengeViolations.length
        };
      });

      // Calculate overall statistics
const totalChallenges = processedChallenges.length;
      const uniqueParticipants = new Set((participantsRaw || []).map(p => p.user_id)).size;
      const totalPenalties = (violations || []).reduce((sum, v) => sum + v.amount_cents, 0);

      return {
        challenges: processedChallenges,
        stats: {
          totalChallenges,
          uniqueParticipants,
          totalPenalties
        }
      };
    },
    enabled: !!start && !!end
  });

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    if (!challengesData) return null;
    
    return challengesData; // Filtering is already applied in the query
  }, [challengesData]);

  const handleFilterChange = {
    participants: (participants: string[]) => setFilters(prev => ({ ...prev, participants })),
    challengeTypes: (challengeTypes: string[]) => setFilters(prev => ({ ...prev, challengeTypes })),
    groups: (groups: string[]) => setFilters(prev => ({ ...prev, groups })),
    clearAll: () => setFilters({ participants: [], challengeTypes: [], groups: [] })
  };

  // Global bar handlers
  const handleExport = () => {
    // Export functionality will be triggered via GlobalBar
  };

  const handleSaveView = () => {
    // Save view functionality
  };

  const handleKPIClick = (kpi: string) => {
    // Scroll to relevant section or apply filter
    switch (kpi) {
      case 'challenges':
        document.getElementById('challenges-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'participants':
        document.getElementById('participants-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'fails':
        document.getElementById('fails-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'penalties':
        document.getElementById('penalties-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Helmet>
          <title>{t[lang].title}</title>
          <meta name="description" content={t[lang].description} />
        </Helmet>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 animate-pulse text-primary" />
            <div className="h-8 bg-muted rounded animate-pulse flex-1" />
          </div>
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

  const { challenges = [], stats = { totalChallenges: 0, uniqueParticipants: 0, totalPenalties: 0 } } = filteredData || {};

  return (
    <div className="animate-fade-in">
      <Helmet>
        <title>{t[lang].title}</title>
        <meta name="description" content={t[lang].description} />
      </Helmet>

      {/* Global Bar - Sticky Header */}
      <GlobalBar
        lang={lang}
        onExport={handleExport}
        onSaveView={handleSaveView}
        onCompareToggle={() => setCompareMode(!compareMode)}
        compareMode={compareMode}
      />

      {/* Main Content */}
      <div className="px-6 space-y-6">
        {/* Filter Bar */}
        {filterOptions && (
          <FilterBar
            participants={filterOptions.participants}
            groups={filterOptions.groups}
            selectedParticipants={filters.participants}
            selectedChallengeTypes={filters.challengeTypes}
            selectedGroups={filters.groups}
            onParticipantsChange={handleFilterChange.participants}
            onChallengeTypesChange={handleFilterChange.challengeTypes}
            onGroupsChange={handleFilterChange.groups}
            onClearAll={handleFilterChange.clearAll}
            lang={lang}
          />
        )}

        {/* KPI Strip */}
        {filteredData && (
          <KPIStrip
            data={filteredData}
            dateRange={{ start, end }}
            lang={lang}
            onKPIClick={handleKPIClick}
          />
        )}

        {/* Weekly Overview */}
        <div className="space-y-4" id="fails-section">
          <h2 className="text-xl font-semibold">{t[lang].weeklyOverview}</h2>
          <div className="space-y-6">
            <WeeklyTimeline lang={lang} />
            <div className="w-full">
              <FailsTrendPremium 
                lang={lang} 
                compareMode={compareMode}
                onCompareParticipants={(a, b) => setCompareParticipants([a, b])}
              />
            </div>
          </div>
        </div>

        {/* Analytics Widgets */}
        <div className="space-y-6">
          {/* First Row - Core Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="participants-section">
            <ParticipantRanking data={[{ challenges }]} lang={lang} />
            <ToughestVsEasiestChallenges data={[{ challenges }]} lang={lang} />
          </div>

          {/* Second Row - Money & Popularity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="penalties-section">
            <BiggestMoneyBurners data={[{ challenges }]} lang={lang} />
            <MostPopularChallenges data={[{ challenges }]} lang={lang} />
          </div>

          {/* Third Row - Advanced Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StreakBreakers data={[{ challenges }]} lang={lang} />
            <BestROIChallenges data={[{ challenges }]} lang={lang} />
          </div>
        </div>

        {/* Timeline */}
        <Timeline />

        {/* Challenges List */}
        <div className="space-y-4" id="challenges-section">
          <h2 className="text-xl font-semibold">{t[lang].challengesList}</h2>
          
          {challenges.length === 0 ? (
            <Card className="animate-scale-in">
              <CardContent className="pt-6 text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-6xl">🎯</div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t[lang].emptyState}</h3>
                    <Button asChild>
                      <Link to="/challenges">
                        {t[lang].createChallenge}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {challenges.map((challenge, index) => (
                <Card key={challenge.id} className="hover:shadow-md transition-all duration-200 hover-scale animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        {challenge.description && (
                          <CardDescription className="line-clamp-2">
                            {challenge.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={challenge.challenge_type === 'habit' ? 'default' : 'secondary'}>
                        {challenge.challenge_type === 'habit' ? t[lang].habit : t[lang].kpi}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(challenge.start_date), 'dd.MM.yyyy', { locale })} - {format(new Date(challenge.end_date), 'dd.MM.yyyy', { locale })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t[lang].participants}</p>
                        <p className="font-medium">{challenge.participantCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t[lang].penalties}</p>
                        <p className="font-medium">{formatEUR(challenge.totalViolationAmount)}</p>
                      </div>
                    </div>

                    <Button asChild className="w-full">
                      <Link to={`/challenges/${challenge.id}`}>
                        {t[lang].viewDetails}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Summary;