import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek, isWithinInterval } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { formatEUR } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { WeekInsightsModal } from "./WeekInsightsModal";

interface WeeklyTimelineProps {
  lang: 'de' | 'en';
}

interface WeekData {
  week: Date;
  weekNumber: number;
  challenges: {
    [challengeId: string]: {
      id: string;
      title: string;
      challenge_type: 'habit' | 'kpi';
      participants: Array<{
        user_id: string;
        display_name: string;
        habitViolations: number;
        kpiDeviations: number;
        totalPenalty: number;
        status: 'success' | 'warning' | 'danger' | 'inactive';
      }>;
      weeklyTotalPenalty: number;
    };
  };
}

export const WeeklyTimeline = ({ lang }: WeeklyTimelineProps) => {
  const { start, end } = useDateRange();
  const locale = lang === 'de' ? de : enUS;
  const [selectedWeekData, setSelectedWeekData] = useState<{
    challengeId: string;
    challengeTitle: string;
    challengeType: 'habit' | 'kpi';
    weekNumber: number;
    participants: Array<{
      user_id: string;
      display_name: string;
      habitViolations: number;
      kpiDeviations: number;
      totalPenalty: number;
      status: 'success' | 'warning' | 'danger' | 'inactive';
      custom_color?: string;
    }>;
    weeklyTotalPenalty: number;
  } | null>(null);

  const t = {
    de: {
      title: "Wochen-Timeline",
      description: "Übersicht aller Teilnehmer nach Wochen",
      week: "KW",
      participant: "Teilnehmer",
      penalty: "Strafe",
      total: "Gesamt",
      noData: "Keine Daten für den gewählten Zeitraum",
      habitViolations: "Habit-Verstöße",
      kpiDeviations: "KPI-Abweichungen",
      challenges: "Challenges",
      clickForDetails: "Klicke für Details"
    },
    en: {
      title: "Weekly Timeline",
      description: "Overview of all participants by week",
      week: "Week",
      participant: "Participant",
      penalty: "Penalty",
      total: "Total",
      noData: "No data for the selected period",
      habitViolations: "Habit Violations",
      kpiDeviations: "KPI Deviations",
      challenges: "Challenges",
      clickForDetails: "Click for details"
    }
  };

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['weekly-timeline', start, end],
    queryFn: async () => {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Get user's groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (!userGroups || userGroups.length === 0) return null;

      const groupIds = userGroups.map(g => g.group_id);

      // Get challenges in date range
      const { data: challenges } = await supabase
        .from('challenges')
        .select(`
          id,
          title,
          challenge_type,
          start_date,
          end_date,
          penalty_amount,
          group_id
        `)
        .in('group_id', groupIds)
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      if (!challenges || challenges.length === 0) return null;

      const challengeIds = challenges.map(c => c.id);

      // Get all participants
      const { data: participantsRaw } = await supabase
        .from('challenge_participants')
        .select('challenge_id, user_id')
        .in('challenge_id', challengeIds);

      // Get profiles
      const userIds = Array.from(new Set((participantsRaw || []).map(p => p.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, custom_color')
        .in('id', userIds);

      const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, { display_name: p.display_name || 'Unknown', custom_color: p.custom_color }]));

      // Get violations
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, amount_cents, created_at')
        .in('challenge_id', challengeIds)
        .gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`);

      // Get KPI measurements
      const { data: kpiMeasurements } = await supabase
        .from('kpi_measurements')
        .select(`
          user_id,
          measured_value,
          measurement_date,
          kpi_definitions!inner(
            challenge_id,
            target_value,
            goal_direction
          )
        `)
        .gte('measurement_date', startStr)
        .lte('measurement_date', endStr);

      // Generate weeks in range
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      
      const weeklyData: WeekData[] = weeks.map(week => {
        const weekStart = startOfWeek(week, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
        const weekNumber = getWeek(week, { weekStartsOn: 1, firstWeekContainsDate: 4 });

        const challengesInWeek: WeekData['challenges'] = {};

        // Process challenges active in this week
        challenges.forEach(challenge => {
          const challengeStart = new Date(challenge.start_date);
          const challengeEnd = new Date(challenge.end_date);
          
          if (isWithinInterval(weekStart, { start: challengeStart, end: challengeEnd }) ||
              isWithinInterval(weekEnd, { start: challengeStart, end: challengeEnd }) ||
              (challengeStart <= weekStart && challengeEnd >= weekEnd)) {
            
            // Get participants for this challenge
            const challengeParticipants = (participantsRaw || [])
              .filter(p => p.challenge_id === challenge.id)
              .map(p => p.user_id);

            const participantData = challengeParticipants.map(userId => {
              const profile = profilesMap[userId] || { display_name: 'Unknown', custom_color: undefined };
              return {
                user_id: userId,
                display_name: profile.display_name,
                custom_color: profile.custom_color,
                habitViolations: 0,
                kpiDeviations: 0,
                totalPenalty: 0,
                status: 'success' as const
              };
            });

            challengesInWeek[challenge.id] = {
              id: challenge.id,
              title: challenge.title,
              challenge_type: challenge.challenge_type,
              participants: participantData,
              weeklyTotalPenalty: 0
            };
          }
        });

        // Process violations in this week
        (violations || []).forEach(violation => {
          const violationDate = new Date(violation.created_at);
          if (isWithinInterval(violationDate, { start: weekStart, end: weekEnd })) {
            Object.values(challengesInWeek).forEach(challenge => {
              const participant = challenge.participants.find(p => p.user_id === violation.user_id);
              if (participant) {
                participant.habitViolations += 1;
                participant.totalPenalty += violation.amount_cents;
                participant.status = 'danger';
                challenge.weeklyTotalPenalty += violation.amount_cents;
              }
            });
          }
        });

        // Process KPI measurements in this week
        (kpiMeasurements || []).forEach(measurement => {
          const measurementDate = new Date(measurement.measurement_date);
          if (isWithinInterval(measurementDate, { start: weekStart, end: weekEnd })) {
            const kpiDef = measurement.kpi_definitions as any;
            const challengeId = kpiDef.challenge_id;
            const challenge = challengesInWeek[challengeId];
            
            if (challenge) {
              const participant = challenge.participants.find(p => p.user_id === measurement.user_id);
              if (participant) {
                const achievement = measurement.measured_value / kpiDef.target_value;
                
                if (kpiDef.goal_direction === 'higher_better' && achievement < 1.0) {
                  participant.kpiDeviations += 1;
                  if (achievement < 0.8) {
                    participant.status = 'danger';
                  } else if (achievement < 0.95) {
                    participant.status = 'warning';
                  }
                } else if (kpiDef.goal_direction === 'lower_better' && achievement > 1.0) {
                  participant.kpiDeviations += 1;
                  if (achievement > 1.2) {
                    participant.status = 'danger';
                  } else if (achievement > 1.05) {
                    participant.status = 'warning';
                  }
                }
              }
            }
          }
        });

        return {
          week: weekStart,
          weekNumber,
          challenges: challengesInWeek
        };
      });

      return weeklyData;
    },
    enabled: !!start && !!end
  });

  const { challengeTotals, weekTotals } = useMemo(() => {
    if (!timelineData) return { challengeTotals: {}, weekTotals: {} };

    const challengeTotals: Record<string, number> = {};
    const weekTotals: Record<string, number> = {};

    timelineData.forEach(weekData => {
      let weekTotal = 0;
      Object.entries(weekData.challenges).forEach(([challengeId, challengeData]) => {
        challengeTotals[challengeId] = (challengeTotals[challengeId] || 0) + challengeData.weeklyTotalPenalty;
        weekTotal += challengeData.weeklyTotalPenalty;
      });
      weekTotals[weekData.weekNumber.toString()] = weekTotal;
    });

    return { challengeTotals, weekTotals };
  }, [timelineData]);

  const handleCellClick = (challengeId: string, weekNumber: number) => {
    if (!challengeId || !timelineData) return;
    
    const weekData = timelineData.find(w => w.weekNumber === weekNumber);
    const challengeData = weekData?.challenges[challengeId];
    
    if (challengeData && weekData) {
      setSelectedWeekData({
        challengeId,
        challengeTitle: challengeData.title,
        challengeType: challengeData.challenge_type,
        weekNumber: weekData.weekNumber,
        participants: challengeData.participants,
        weeklyTotalPenalty: challengeData.weeklyTotalPenalty
      });
    }
  };

  const getCellContent = (challengeData: WeekData['challenges'][string]) => {
    const totalFailures = challengeData.participants.reduce((sum, p) => sum + p.habitViolations + p.kpiDeviations, 0);
    const hasParticipants = challengeData.participants.length > 0;

    if (!hasParticipants) {
      return { content: '', bgColor: 'bg-muted/50', textColor: 'text-muted-foreground' };
    }

    if (totalFailures === 0) {
      return { content: '✓', bgColor: 'bg-primary/10', textColor: 'text-primary' };
    }

    const content = totalFailures.toString();
    const worstStatus = challengeData.participants.reduce<'success' | 'warning' | 'danger'>((worst, p) => {
      if (p.status === 'danger') return 'danger';
      if (p.status === 'warning' && worst === 'success') return 'warning';
      return worst;
    }, 'success');
    
    switch (worstStatus) {
      case 'danger':
        return { content, bgColor: 'bg-destructive/10', textColor: 'text-destructive' };
      case 'warning':
        return { content, bgColor: 'bg-orange-100 dark:bg-orange-900/20', textColor: 'text-orange-700 dark:text-orange-300' };
      default:
        return { content, bgColor: 'bg-primary/10', textColor: 'text-primary' };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t[lang].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-full" />
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timelineData || timelineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t[lang].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueChallenges = Array.from(new Set(
    timelineData.flatMap(week => Object.keys(week.challenges))
  )).map(challengeId => {
    const challengeInfo = timelineData
      .flatMap(week => Object.values(week.challenges))
      .find(c => c.id === challengeId);
    return challengeInfo;
  }).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t[lang].title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-fit">
            <TooltipProvider>
              {/* Header Row */}
              <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `200px repeat(${timelineData.length}, 60px) 100px` }}>
                <div className="p-2 font-medium text-sm">{t[lang].challenges}</div>
                {timelineData.map(week => (
                  <div key={week.weekNumber} className="p-2 text-center font-medium text-sm">
                    {t[lang].week} {week.weekNumber}
                  </div>
                ))}
                <div className="p-2 text-center font-medium text-sm">{t[lang].penalty}</div>
              </div>

              {/* Challenge Rows */}
              {uniqueChallenges.map(challenge => {
                if (!challenge) return null;

                return (
                  <div key={challenge.id} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: `200px repeat(${timelineData.length}, 60px) 100px` }}>
                    <div className="p-2 truncate text-sm font-medium">
                      {challenge.title}
                    </div>
                    {timelineData.map(week => {
                      const challengeData = week.challenges[challenge.id];
                      if (!challengeData) return <div key={week.weekNumber} className="p-2 bg-muted/20 rounded" />;

                      const { content, bgColor, textColor } = getCellContent(challengeData);

                      return (
                        <Tooltip key={week.weekNumber}>
                          <TooltipTrigger asChild>
                            <div
                              className={`p-2 text-center text-sm font-medium rounded cursor-pointer transition-colors hover:opacity-80 ${bgColor} ${textColor}`}
                              onClick={() => handleCellClick(challenge.id, week.weekNumber)}
                            >
                              {content}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <div className="space-y-2">
                              <div className="font-medium">
                                {challenge.title} - {t[lang].week} {week.weekNumber}
                              </div>
                              {challengeData.participants.length > 0 && (
                                <>
                                  <div className="text-sm font-medium">{t[lang].participant}:</div>
                                  {challengeData.participants.map(participant => (
                                    <div key={participant.user_id} className="text-sm space-y-1 p-2 bg-muted/20 rounded">
                                      <div className="font-medium">{participant.display_name}</div>
                                      {participant.habitViolations > 0 && (
                                        <div className="text-destructive">
                                          {t[lang].habitViolations}: {participant.habitViolations}
                                        </div>
                                      )}
                                      {participant.kpiDeviations > 0 && (
                                        <div className="text-orange-600">
                                          {t[lang].kpiDeviations}: {participant.kpiDeviations}
                                        </div>
                                      )}
                                      {participant.totalPenalty > 0 && (
                                        <div>{t[lang].penalty}: {formatEUR(participant.totalPenalty)}</div>
                                      )}
                                      {participant.habitViolations === 0 && participant.kpiDeviations === 0 && (
                                        <div className="text-primary">✓ Erfolgreich</div>
                                      )}
                                    </div>
                                  ))}
                                  <div className="text-xs text-muted-foreground">
                                    {t[lang].clickForDetails}
                                  </div>
                                </>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    <div className="p-2 text-center text-sm font-medium">
                      {formatEUR(challengeTotals[challenge.id] || 0)}
                    </div>
                  </div>
                );
              })}

              {/* Footer Row */}
              <div className="grid gap-1 mt-2 pt-2 border-t" style={{ gridTemplateColumns: `200px repeat(${timelineData.length}, 60px) 100px` }}>
                <div className="p-2 font-medium text-sm">{t[lang].total}</div>
                {timelineData.map(week => (
                  <div key={week.weekNumber} className="p-2 text-center text-sm font-medium">
                    {formatEUR(weekTotals[week.weekNumber.toString()] || 0)}
                  </div>
                ))}
                <div className="p-2 text-center text-sm font-bold">
                  {formatEUR(Object.values(challengeTotals).reduce((sum, total) => sum + total, 0))}
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      
      <WeekInsightsModal
        isOpen={!!selectedWeekData}
        onClose={() => setSelectedWeekData(null)}
        weekData={selectedWeekData}
        lang={lang}
      />
    </Card>
  );
};