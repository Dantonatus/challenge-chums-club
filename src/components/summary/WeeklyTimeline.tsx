import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek, isWithinInterval } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { formatEUR } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface WeeklyTimelineProps {
  lang: 'de' | 'en';
}

interface WeekData {
  week: Date;
  weekNumber: number;
  participants: {
    [userId: string]: {
      display_name: string;
      habitViolations: number;
      kpiDeviations: number;
      totalPenalty: number;
      challenges: Array<{
        id: string;
        title: string;
        challenge_type: 'habit' | 'kpi';
      }>;
      status: 'success' | 'warning' | 'danger' | 'inactive';
    };
  };
}

export const WeeklyTimeline = ({ lang }: WeeklyTimelineProps) => {
  const { start, end } = useDateRange();
  const navigate = useNavigate();
  const locale = lang === 'de' ? de : enUS;

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
        .select('id, display_name')
        .in('id', userIds);

      const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Unknown']));

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

        const participants: WeekData['participants'] = {};

        // Initialize all participants
        userIds.forEach(userId => {
          participants[userId] = {
            display_name: profilesMap[userId],
            habitViolations: 0,
            kpiDeviations: 0,
            totalPenalty: 0,
            challenges: [],
            status: 'inactive'
          };
        });

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

            challengeParticipants.forEach(userId => {
              if (participants[userId]) {
                participants[userId].challenges.push({
                  id: challenge.id,
                  title: challenge.title,
                  challenge_type: challenge.challenge_type
                });
                participants[userId].status = 'success'; // Default to success
              }
            });
          }
        });

        // Process violations in this week
        (violations || []).forEach(violation => {
          const violationDate = new Date(violation.created_at);
          if (isWithinInterval(violationDate, { start: weekStart, end: weekEnd })) {
            if (participants[violation.user_id]) {
              participants[violation.user_id].habitViolations += 1;
              participants[violation.user_id].totalPenalty += violation.amount_cents;
              participants[violation.user_id].status = 'danger';
            }
          }
        });

        // Process KPI measurements in this week
        (kpiMeasurements || []).forEach(measurement => {
          const measurementDate = new Date(measurement.measurement_date);
          if (isWithinInterval(measurementDate, { start: weekStart, end: weekEnd })) {
            if (participants[measurement.user_id]) {
              const kpiDef = measurement.kpi_definitions as any;
              const achievement = measurement.measured_value / kpiDef.target_value;
              
              if (kpiDef.goal_direction === 'higher_better' && achievement < 1.0) {
                participants[measurement.user_id].kpiDeviations += 1;
                if (achievement < 0.8) {
                  participants[measurement.user_id].status = 'danger';
                } else if (achievement < 0.95) {
                  participants[measurement.user_id].status = 'warning';
                }
              } else if (kpiDef.goal_direction === 'lower_better' && achievement > 1.0) {
                participants[measurement.user_id].kpiDeviations += 1;
                if (achievement > 1.2) {
                  participants[measurement.user_id].status = 'danger';
                } else if (achievement > 1.05) {
                  participants[measurement.user_id].status = 'warning';
                }
              }
            }
          }
        });

        return {
          week: weekStart,
          weekNumber,
          participants
        };
      });

      return weeklyData;
    },
    enabled: !!start && !!end
  });

  const { participantTotals, weekTotals } = useMemo(() => {
    if (!timelineData) return { participantTotals: {}, weekTotals: {} };

    const participantTotals: Record<string, number> = {};
    const weekTotals: Record<string, number> = {};

    timelineData.forEach(weekData => {
      let weekTotal = 0;
      Object.entries(weekData.participants).forEach(([userId, data]) => {
        participantTotals[userId] = (participantTotals[userId] || 0) + data.totalPenalty;
        weekTotal += data.totalPenalty;
      });
      weekTotals[weekData.weekNumber.toString()] = weekTotal;
    });

    return { participantTotals, weekTotals };
  }, [timelineData]);

  const handleCellClick = (challengeId: string) => {
    if (challengeId) {
      navigate(`/app/challenges/${challengeId}`);
    }
  };

  const getCellContent = (participantData: WeekData['participants'][string]) => {
    const { habitViolations, kpiDeviations, status, challenges } = participantData;
    const totalFailures = habitViolations + kpiDeviations;

    if (challenges.length === 0) {
      return { content: '', bgColor: 'bg-muted/50', textColor: 'text-muted-foreground' };
    }

    if (totalFailures === 0) {
      return { content: '✓', bgColor: 'bg-accent/20', textColor: 'text-accent-foreground' };
    }

    const content = totalFailures > 0 ? totalFailures.toString() : '';
    
    switch (status) {
      case 'danger':
        return { content, bgColor: 'bg-destructive/20', textColor: 'text-destructive-foreground' };
      case 'warning':
        return { content, bgColor: 'bg-orange-100 dark:bg-orange-900/20', textColor: 'text-orange-700 dark:text-orange-300' };
      default:
        return { content, bgColor: 'bg-accent/20', textColor: 'text-accent-foreground' };
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

  const uniqueParticipants = Array.from(new Set(
    timelineData.flatMap(week => Object.keys(week.participants))
  )).filter(userId => 
    timelineData.some(week => week.participants[userId]?.challenges.length > 0)
  );

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
                <div className="p-2 font-medium text-sm">{t[lang].participant}</div>
                {timelineData.map(week => (
                  <div key={week.weekNumber} className="p-2 text-center font-medium text-sm">
                    {t[lang].week} {week.weekNumber}
                  </div>
                ))}
                <div className="p-2 text-center font-medium text-sm">{t[lang].penalty}</div>
              </div>

              {/* Participant Rows */}
              {uniqueParticipants.map(userId => {
                const firstWeekData = timelineData[0]?.participants[userId];
                if (!firstWeekData) return null;

                return (
                  <div key={userId} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: `200px repeat(${timelineData.length}, 60px) 100px` }}>
                    <div className="p-2 truncate text-sm font-medium">
                      {firstWeekData.display_name}
                    </div>
                    {timelineData.map(week => {
                      const participantData = week.participants[userId];
                      if (!participantData) return <div key={week.weekNumber} />;

                      const { content, bgColor, textColor } = getCellContent(participantData);
                      const firstChallenge = participantData.challenges[0];

                      return (
                        <Tooltip key={week.weekNumber}>
                          <TooltipTrigger asChild>
                            <div
                              className={`p-2 text-center text-sm font-medium rounded cursor-pointer transition-colors hover:opacity-80 ${bgColor} ${textColor}`}
                              onClick={() => firstChallenge && handleCellClick(firstChallenge.id)}
                            >
                              {content}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {t[lang].week} {week.weekNumber} - {firstWeekData.display_name}
                              </div>
                              {participantData.challenges.length > 0 && (
                                <>
                                  <div className="text-sm">
                                    {t[lang].challenges}: {participantData.challenges.map(c => c.title).join(', ')}
                                  </div>
                                  {participantData.habitViolations > 0 && (
                                    <div className="text-sm text-destructive">
                                      {t[lang].habitViolations}: {participantData.habitViolations}
                                    </div>
                                  )}
                                  {participantData.kpiDeviations > 0 && (
                                    <div className="text-sm text-orange-600">
                                      {t[lang].kpiDeviations}: {participantData.kpiDeviations}
                                    </div>
                                  )}
                                  {participantData.totalPenalty > 0 && (
                                    <div className="text-sm">
                                      {t[lang].penalty}: {formatEUR(participantData.totalPenalty)}
                                    </div>
                                  )}
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
                      {formatEUR(participantTotals[userId] || 0)}
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
                  {formatEUR(Object.values(participantTotals).reduce((sum, total) => sum + total, 0))}
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};