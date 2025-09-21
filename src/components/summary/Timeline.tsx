import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/currency";
import { useSummaryFiltersContext } from "@/contexts/SummaryFiltersContext";

interface TimelineData {
  challenges: Array<{
    id: string;
    title: string;
    challenge_type: 'habit' | 'kpi';
    start_date: string;
    end_date: string;
    penalty_amount: number;
    participants: Array<{ user_id: string; display_name?: string }>;
    violations: Array<{ date: string; user_id: string; amount_cents: number }>;
    kpi_measurements?: Array<{ date: string; user_id: string; measured_value: number; target_value: number }>;
  }>;
  days: Date[];
}

export const Timeline = () => {
  const { start, end } = useDateRange();
  const { allFilters } = useSummaryFiltersContext();
  const navigate = useNavigate();
  const lang = navigator.language.startsWith('de') ? 'de' : 'en';
  const locale = lang === 'de' ? de : enUS;

  const t = {
    de: {
      timeline: "Zeitstrahl",
      noViolation: "Keine Verletzung",
      violation: "Verstoß",
      notActive: "Challenge nicht aktiv",
      kpiMet: "KPI erfüllt",
      kpiClose: "KPI knapp verfehlt",
      kpiFar: "KPI weit verfehlt",
      noData: "Keine Daten",
      participant: "Teilnehmer",
      penalty: "Strafe",
      value: "Wert",
      target: "Ziel",
    },
    en: {
      timeline: "Timeline",
      noViolation: "No violation",
      violation: "Violation",
      notActive: "Challenge not active",
      kpiMet: "KPI met",
      kpiClose: "KPI close miss",
      kpiFar: "KPI far miss",
      noData: "No data",
      participant: "Participant",
      penalty: "Penalty",
      value: "Value",
      target: "Target",
    }
  };

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['timeline-data', allFilters],
    queryFn: async (): Promise<TimelineData> => {
      // Generate all days in the range
      const days = eachDayOfInterval({ start: new Date(start), end: new Date(end) });

      // Fetch challenges that overlap with the date range
      let challengesQuery = supabase
        .from('challenges')
        .select(`
          id,
          title,
          challenge_type,
          start_date,
          end_date,
          penalty_amount,
          kpi_definitions (
            target_value,
            unit
          )
        `)
        .lte('start_date', allFilters.endDate)
        .gte('end_date', allFilters.startDate);

      // Apply filters
      if (allFilters.challengeTypes.length > 0) {
        challengesQuery = challengesQuery.in('challenge_type', allFilters.challengeTypes);
      }
      if (allFilters.groups.length > 0) {
        challengesQuery = challengesQuery.in('group_id', allFilters.groups);
      }

      const { data: challenges, error: challengesError } = await challengesQuery;

      if (challengesError) throw challengesError;

      // Fetch participants for all challenges
      const challengeIds = challenges.map(c => c.id);
      let participantsQuery = supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          user_id,
          profiles!inner(display_name)
        `)
        .in('challenge_id', challengeIds);

      if (allFilters.participants.length > 0) {
        participantsQuery = participantsQuery.in('user_id', allFilters.participants);
      }

      const { data: participants, error: participantsError } = await participantsQuery;

      if (participantsError) throw participantsError;

      // Fetch violations in the date range
      let violationsQuery = supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, amount_cents, created_at')
        .in('challenge_id', challengeIds)
        .gte('created_at', allFilters.startDate + 'T00:00:00')
        .lte('created_at', allFilters.endDate + 'T23:59:59');

      if (allFilters.participants.length > 0) {
        violationsQuery = violationsQuery.in('user_id', allFilters.participants);
      }

      const { data: violations, error: violationsError } = await violationsQuery;

      if (violationsError) throw violationsError;

      // Fetch KPI measurements for KPI challenges
      const kpiChallengeIds = challenges
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
          .gte('measurement_date', allFilters.startDate)
          .lte('measurement_date', allFilters.endDate);

        if (allFilters.participants.length > 0) {
          kpiQuery = kpiQuery.in('user_id', allFilters.participants);
        }

        const { data: kpiData, error: kpiError } = await kpiQuery;

        if (kpiError) throw kpiError;
        kpiMeasurements = kpiData || [];
      }

      // Process data for each challenge
      const processedChallenges = challenges.map(challenge => {
        const challengeParticipants = participants
          .filter(p => p.challenge_id === challenge.id)
          .map(p => ({
            user_id: p.user_id,
            display_name: (p.profiles as any)?.display_name || 'Unknown'
          }));

        const challengeViolations = violations
          .filter(v => v.challenge_id === challenge.id)
          .map(v => ({
            date: format(new Date(v.created_at), 'yyyy-MM-dd'),
            user_id: v.user_id,
            amount_cents: v.amount_cents
          }));

        let challengeKpiMeasurements: any[] = [];
        if (challenge.challenge_type === 'kpi') {
          challengeKpiMeasurements = kpiMeasurements
            .filter(m => m.kpi_definitions.challenge_id === challenge.id)
            .map(m => ({
              date: m.measurement_date,
              user_id: m.user_id,
              measured_value: m.measured_value,
              target_value: m.kpi_definitions.target_value
            }));
        }

        return {
          id: challenge.id,
          title: challenge.title,
          challenge_type: challenge.challenge_type,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          penalty_amount: challenge.penalty_amount,
          participants: challengeParticipants,
          violations: challengeViolations,
          kpi_measurements: challengeKpiMeasurements
        };
      });

      return {
        challenges: processedChallenges,
        days
      };
    },
    enabled: !!allFilters.startDate && !!allFilters.endDate
  });

  const getCellStatus = (challenge: TimelineData['challenges'][0], day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const challengeStart = new Date(challenge.start_date);
    const challengeEnd = new Date(challenge.end_date);

    // Check if challenge is active on this day
    if (day < challengeStart || day > challengeEnd) {
      return { type: 'inactive', color: 'bg-muted/30' };
    }

    if (challenge.challenge_type === 'habit') {
      // Check for violations on this day
      const dayViolations = challenge.violations.filter(v => v.date === dayStr);
      if (dayViolations.length > 0) {
        return { 
          type: 'violation', 
          color: 'bg-red-500 hover:bg-red-600',
          data: dayViolations
        };
      }
      return { 
        type: 'no-violation', 
        color: 'bg-green-500 hover:bg-green-600' 
      };
    } else {
      // KPI challenge - check measurements
      const dayMeasurements = challenge.kpi_measurements?.filter(m => m.date === dayStr) || [];
      if (dayMeasurements.length === 0) {
        return { 
          type: 'no-data', 
          color: 'bg-muted hover:bg-muted/80' 
        };
      }

      // Calculate average performance vs target
      const avgPerformance = dayMeasurements.reduce((sum, m) => {
        const performance = m.measured_value / m.target_value;
        return sum + performance;
      }, 0) / dayMeasurements.length;

      if (avgPerformance >= 1.0) {
        return { 
          type: 'kpi-met', 
          color: 'bg-green-500 hover:bg-green-600',
          data: dayMeasurements
        };
      } else if (avgPerformance >= 0.8) {
        return { 
          type: 'kpi-close', 
          color: 'bg-yellow-500 hover:bg-yellow-600',
          data: dayMeasurements
        };
      } else {
        return { 
          type: 'kpi-far', 
          color: 'bg-red-500 hover:bg-red-600',
          data: dayMeasurements
        };
      }
    }
  };

  const getTooltipContent = (challenge: TimelineData['challenges'][0], day: Date, status: any) => {
    const dayStr = format(day, 'dd.MM.yyyy', { locale });
    
    if (status.type === 'inactive') {
      return `${dayStr}: ${t[lang].notActive}`;
    }

    if (challenge.challenge_type === 'habit') {
      if (status.type === 'violation' && status.data) {
        const violations = status.data as Array<{user_id: string, amount_cents: number}>;
        return (
          <div className="space-y-1">
            <div className="font-medium">{challenge.title}</div>
            <div className="text-sm">{dayStr}</div>
            {violations.map((v, i) => {
              const participant = challenge.participants.find(p => p.user_id === v.user_id);
              return (
                <div key={i} className="text-sm">
                  {participant?.display_name}: {formatEUR(v.amount_cents)}
                </div>
              );
            })}
          </div>
        );
      }
      return `${dayStr}: ${t[lang].noViolation}`;
    } else {
      if (status.data) {
        const measurements = status.data as Array<{user_id: string, measured_value: number, target_value: number}>;
        return (
          <div className="space-y-1">
            <div className="font-medium">{challenge.title}</div>
            <div className="text-sm">{dayStr}</div>
            {measurements.map((m, i) => {
              const participant = challenge.participants.find(p => p.user_id === m.user_id);
              return (
                <div key={i} className="text-sm">
                  {participant?.display_name}: {m.measured_value} / {m.target_value}
                </div>
              );
            })}
          </div>
        );
      }
      return `${dayStr}: ${t[lang].noData}`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t[lang].timeline}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timelineData) return null;

  const { challenges, days } = timelineData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t[lang].timeline}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <div className="min-w-max">
            {/* Header with dates */}
            <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: `250px repeat(${days.length}, 24px)` }}>
              <div className="sticky left-0 bg-background z-10 border-r pr-2">
                <div className="text-sm font-medium">Challenge</div>
              </div>
              {days.map((day, index) => (
                <div key={index} className="text-xs text-center transform -rotate-45 origin-bottom">
                  {index === 0 || day.getDate() === 1 ? (
                    <div className="font-medium">
                      {format(day, 'MMM', { locale })}
                    </div>
                  ) : day.getDate() % 7 === 0 ? (
                    <div>{format(day, 'dd')}</div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Challenge rows */}
            <TooltipProvider>
              <div className="space-y-2">
                {challenges.map(challenge => (
                  <div 
                    key={challenge.id}
                    className="grid gap-1 items-center group cursor-pointer hover:bg-muted/50 p-1 rounded"
                    style={{ gridTemplateColumns: `250px repeat(${days.length}, 24px)` }}
                    onClick={() => navigate(`/challenges/${challenge.id}`)}
                  >
                    <div className="sticky left-0 bg-background z-10 border-r pr-2">
                      <div className="text-sm font-medium truncate">{challenge.title}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={challenge.challenge_type === 'habit' ? 'default' : 'secondary'} className="text-xs">
                          {challenge.challenge_type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {challenge.participants.length} {t[lang].participant}
                        </span>
                      </div>
                    </div>
                    
                    {days.map((day, dayIndex) => {
                      const status = getCellStatus(challenge, day);
                      return (
                        <Tooltip key={dayIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "h-5 w-5 rounded-sm border transition-colors cursor-pointer",
                                status.color
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {getTooltipContent(challenge, day, status)}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};