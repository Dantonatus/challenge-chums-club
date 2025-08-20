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
import { Calendar, Users, TrendingUp, Target } from "lucide-react";

const Summary = () => {
  const { start, end } = useDateRange();
  const lang = navigator.language.startsWith('de') ? 'de' : 'en';
  const locale = lang === 'de' ? de : enUS;

  const t = {
    de: {
      title: "Übersicht",
      description: "Überblick über alle Challenges im gewählten Zeitraum",
      totalChallenges: "Challenges gesamt",
      totalParticipants: "Teilnehmer",
      totalPenalties: "Gesamtstrafen",
      challengesList: "Alle Challenges",
      participants: "Teilnehmer",
      penalties: "Strafen",
      viewDetails: "Details ansehen",
      habit: "Habit",
      kpi: "KPI",
      period: "Zeitraum",
      noChallenges: "Keine Challenges im gewählten Zeitraum gefunden.",
    },
    en: {
      title: "Summary",
      description: "Overview of all challenges in the selected time period",
      totalChallenges: "Total Challenges",
      totalParticipants: "Participants",
      totalPenalties: "Total Penalties",
      challengesList: "All Challenges",
      participants: "Participants",
      penalties: "Penalties",
      viewDetails: "View Details",
      habit: "Habit",
      kpi: "KPI",
      period: "Period",
      noChallenges: "No challenges found in the selected time period.",
    }
  };

  // Fetch challenges with participants and violations data
  const { data: challengesData, isLoading } = useQuery({
    queryKey: ['challenges-summary', start, end],
    queryFn: async () => {
      // Fetch challenges that overlap with the date range
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select(`
          id,
          title,
          challenge_type,
          start_date,
          end_date,
          penalty_amount,
          description,
          kpi_definitions!inner(
            id,
            kpi_type,
            target_value,
            unit
          )
        `)
        .lte('start_date', end)
        .gte('end_date', start);

      if (challengesError) throw challengesError;

      // Also fetch habit challenges (those without KPI definitions)
      const { data: habitChallenges, error: habitError } = await supabase
        .from('challenges')
        .select(`
          id,
          title,
          challenge_type,
          start_date,
          end_date,
          penalty_amount,
          description
        `)
        .eq('challenge_type', 'habit')
        .lte('start_date', end)
        .gte('end_date', start);

      if (habitError) throw habitError;

      // Combine all challenges
      const allChallenges = [
        ...challenges.map(c => ({ ...c, hasKpi: true })),
        ...habitChallenges.map(c => ({ ...c, hasKpi: false, kpi_definitions: [] }))
      ];

      // Remove duplicates by id
      const uniqueChallenges = allChallenges.filter((challenge, index, self) => 
        index === self.findIndex(c => c.id === challenge.id)
      );

      // Fetch participants for each challenge
      const challengeIds = uniqueChallenges.map(c => c.id);
      const { data: participants, error: participantsError } = await supabase
        .from('challenge_participants')
        .select('challenge_id, user_id')
        .in('challenge_id', challengeIds);

      if (participantsError) throw participantsError;

      // Fetch violations for each challenge
      const { data: violations, error: violationsError } = await supabase
        .from('challenge_violations')
        .select('challenge_id, amount_cents, created_at')
        .in('challenge_id', challengeIds)
        .gte('created_at', start + 'T00:00:00')
        .lte('created_at', end + 'T23:59:59');

      if (violationsError) throw violationsError;

      // Calculate statistics for each challenge
      const challengesWithStats = uniqueChallenges.map(challenge => {
        const challengeParticipants = participants.filter(p => p.challenge_id === challenge.id);
        const challengeViolations = violations.filter(v => v.challenge_id === challenge.id);
        
        return {
          ...challenge,
          participantCount: challengeParticipants.length,
          totalViolationAmount: challengeViolations.reduce((sum, v) => sum + v.amount_cents, 0),
          violationCount: challengeViolations.length
        };
      });

      // Calculate overall statistics
      const totalChallenges = challengesWithStats.length;
      const uniqueParticipants = new Set(participants.map(p => p.user_id)).size;
      const totalPenalties = violations.reduce((sum, v) => sum + v.amount_cents, 0);

      return {
        challenges: challengesWithStats,
        stats: {
          totalChallenges,
          uniqueParticipants,
          totalPenalties
        }
      };
    },
    enabled: !!start && !!end
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Helmet>
          <title>{t[lang].title}</title>
          <meta name="description" content={t[lang].description} />
        </Helmet>
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
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
      </div>
    );
  }

  const { challenges = [], stats = { totalChallenges: 0, uniqueParticipants: 0, totalPenalties: 0 } } = challengesData || {};

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{t[lang].title}</title>
        <meta name="description" content={t[lang].description} />
      </Helmet>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t[lang].title}</h1>
        <p className="text-muted-foreground">{t[lang].description}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t[lang].totalChallenges}</p>
                <p className="text-2xl font-bold">{stats.totalChallenges}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t[lang].totalParticipants}</p>
                <p className="text-2xl font-bold">{stats.uniqueParticipants}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t[lang].totalPenalties}</p>
                <p className="text-2xl font-bold">{formatEUR(stats.totalPenalties)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t[lang].challengesList}</h2>
        
        {challenges.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">{t[lang].noChallenges}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="hover:shadow-md transition-shadow">
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
  );
};

export default Summary;