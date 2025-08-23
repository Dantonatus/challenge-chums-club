import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDateRange } from "@/contexts/DateRangeContext";
import { formatEUR } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { WeekDrilldownModal } from "./WeekDrilldownModal";
import { startOfISOWeek, endOfISOWeek, isoWeekOf, weekRangeLabel, buildIsoWeeksInRange } from "@/lib/date";
import { format, isWithinInterval } from "date-fns";
import { motion } from "framer-motion";

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
        custom_color?: string;
      }>;
      weeklyTotalPenalty: number;
      isActive: boolean;
    };
  };
}

interface DrilldownData {
  challengeId: string;
  challengeTitle: string;
  challengeType: 'habit' | 'kpi';
  weekNumber: number;
  weekLabel: string;
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
  events: Array<{
    type: 'violation' | 'kpi_miss';
    timestamp: string;
    user_id: string;
    display_name: string;
    amount_cents?: number;
    description: string;
  }>;
}

export const WeeklyTimeline = ({ lang }: WeeklyTimelineProps) => {
  const { start, end } = useDateRange();
  const [selectedDrilldown, setSelectedDrilldown] = useState<DrilldownData | null>(null);

  const t = {
    de: {
      title: "Wochen-Timeline Matrix",
      description: "Übersicht aller Challenges nach Wochen mit Excel-ähnlicher Matrix",
      week: "KW",
      challenge: "Challenge",
      penalty: "Strafe",
      total: "Gesamt",
      noData: "Keine Daten für den gewählten Zeitraum",
      habitViolations: "Habit-Verstöße",
      kpiDeviations: "KPI-Abweichungen",
      challenges: "Challenges",
      clickForDetails: "Klicke für Details",
      participants: "Teilnehmer",
      weekTotal: "Wochensumme",
      challengeTotal: "Challenge-Summe",
      inactive: "Inaktiv",
      success: "Erfolgreich",
      loading: "Lade Timeline-Daten..."
    },
    en: {
      title: "Weekly Timeline Matrix",
      description: "Overview of all challenges by week in Excel-like matrix",
      week: "Week",
      challenge: "Challenge",
      penalty: "Penalty",
      total: "Total",
      noData: "No data for the selected period",
      habitViolations: "Habit Violations",
      kpiDeviations: "KPI Deviations",
      challenges: "Challenges",
      clickForDetails: "Click for details",
      participants: "Participants",
      weekTotal: "Week Total",
      challengeTotal: "Challenge Total", 
      inactive: "Inactive",
      success: "Successful",
      loading: "Loading timeline data..."
    }
  };

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['weekly-timeline-matrix', start.toISOString(), end.toISOString()],
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

      const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, { 
        display_name: p.display_name || 'Unknown', 
        custom_color: p.custom_color 
      }]));

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

      // Generate weeks using ISO week standards with buildIsoWeeksInRange
      const isoWeeks = buildIsoWeeksInRange(start, end);
      
      const weeklyData: WeekData[] = isoWeeks.map(week => {
        const weekStart = week.start;
        const weekEnd = endOfISOWeek(week.start);
        const weekNumber = week.isoWeek;

        const challengesInWeek: WeekData['challenges'] = {};

        // Process challenges active in this week
        challenges.forEach(challenge => {
          const challengeStart = new Date(challenge.start_date);
          const challengeEnd = new Date(challenge.end_date);
          
          const isActive = isWithinInterval(weekStart, { start: challengeStart, end: challengeEnd }) ||
                          isWithinInterval(weekEnd, { start: challengeStart, end: challengeEnd }) ||
                          (challengeStart <= weekStart && challengeEnd >= weekEnd);
          
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
              status: isActive ? 'success' as const : 'inactive' as const
            };
          });

          challengesInWeek[challenge.id] = {
            id: challenge.id,
            title: challenge.title,
            challenge_type: challenge.challenge_type,
            participants: participantData,
            weeklyTotalPenalty: 0,
            isActive
          };
        });

        // Process violations in this week
        (violations || []).forEach(violation => {
          const violationDate = new Date(violation.created_at);
          if (isWithinInterval(violationDate, { start: weekStart, end: weekEnd })) {
            const challenge = challengesInWeek[violation.challenge_id];
            if (challenge) {
              const participant = challenge.participants.find(p => p.user_id === violation.user_id);
              if (participant) {
                participant.habitViolations += 1;
                participant.totalPenalty += violation.amount_cents;
                participant.status = 'danger';
                challenge.weeklyTotalPenalty += violation.amount_cents;
              }
            }
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

      return { weeklyData, violations: violations || [], kpiMeasurements: kpiMeasurements || [] };
    },
    enabled: !!start && !!end
  });

  const { challengeTotals, weekTotals, uniqueChallenges } = useMemo(() => {
    if (!timelineData?.weeklyData) return { challengeTotals: {}, weekTotals: {}, uniqueChallenges: [] };

    const challengeTotals: Record<string, number> = {};
    const weekTotals: Record<string, number> = {};

    timelineData.weeklyData.forEach(weekData => {
      let weekTotal = 0;
      Object.entries(weekData.challenges).forEach(([challengeId, challengeData]) => {
        challengeTotals[challengeId] = (challengeTotals[challengeId] || 0) + challengeData.weeklyTotalPenalty;
        weekTotal += challengeData.weeklyTotalPenalty;
      });
      weekTotals[weekData.weekNumber.toString()] = weekTotal;
    });

    const uniqueChallenges = Array.from(new Set(
      timelineData.weeklyData.flatMap(week => Object.keys(week.challenges))
    )).map(challengeId => {
      const challengeInfo = timelineData.weeklyData
        .flatMap(week => Object.values(week.challenges))
        .find(c => c.id === challengeId);
      return challengeInfo;
    }).filter(Boolean);

    return { challengeTotals, weekTotals, uniqueChallenges };
  }, [timelineData]);

  const handleCellClick = useCallback((challengeId: string, weekNumber: number) => {
    if (!challengeId || !timelineData) return;
    
    const weekData = timelineData.weeklyData.find(w => w.weekNumber === weekNumber);
    const challengeData = weekData?.challenges[challengeId];
    
    if (challengeData && weekData) {
      // Gather detailed events for this week and challenge
      const weekStart = startOfISOWeek(weekData.week);
      const weekEnd = endOfISOWeek(weekData.week);
      
      const events: DrilldownData['events'] = [];
      
      // Add violation events
      timelineData.violations.forEach(violation => {
        const violationDate = new Date(violation.created_at);
        if (violation.challenge_id === challengeId && 
            isWithinInterval(violationDate, { start: weekStart, end: weekEnd })) {
          const participant = challengeData.participants.find(p => p.user_id === violation.user_id);
          events.push({
            type: 'violation',
            timestamp: violation.created_at,
            user_id: violation.user_id,
            display_name: participant?.display_name || 'Unknown',
            amount_cents: violation.amount_cents,
            description: `Habit violation (${formatEUR(violation.amount_cents)})`
          });
        }
      });

      // Add KPI miss events
      timelineData.kpiMeasurements.forEach(measurement => {
        const measurementDate = new Date(measurement.measurement_date);
        const kpiDef = measurement.kpi_definitions as any;
        
        if (kpiDef.challenge_id === challengeId && 
            isWithinInterval(measurementDate, { start: weekStart, end: weekEnd })) {
          const participant = challengeData.participants.find(p => p.user_id === measurement.user_id);
          const achievement = measurement.measured_value / kpiDef.target_value;
          
          let isMiss = false;
          if (kpiDef.goal_direction === 'higher_better' && achievement < 1.0) {
            isMiss = true;
          } else if (kpiDef.goal_direction === 'lower_better' && achievement > 1.0) {
            isMiss = true;
          }
          
          if (isMiss) {
            events.push({
              type: 'kpi_miss',
              timestamp: measurement.measurement_date,
              user_id: measurement.user_id,
              display_name: participant?.display_name || 'Unknown',
              description: `KPI miss: ${measurement.measured_value}/${kpiDef.target_value}`
            });
          }
        }
      });

      // Sort events by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setSelectedDrilldown({
        challengeId,
        challengeTitle: challengeData.title,
        challengeType: challengeData.challenge_type,
        weekNumber: weekData.weekNumber,
        weekLabel: weekRangeLabel(weekStart, weekEnd, lang),
        participants: challengeData.participants,
        weeklyTotalPenalty: challengeData.weeklyTotalPenalty,
        events
      });
    }
  }, [timelineData, lang]);

  const getCellContent = useCallback((challengeData: WeekData['challenges'][string]) => {
    if (!challengeData.isActive) {
      return { content: '', bgColor: 'bg-muted/30', textColor: 'text-muted-foreground', style: 'inactive' };
    }

    const totalFailures = challengeData.participants.reduce((sum, p) => sum + p.habitViolations + p.kpiDeviations, 0);
    const hasParticipants = challengeData.participants.length > 0;

    if (!hasParticipants) {
      return { content: '', bgColor: 'bg-muted/50', textColor: 'text-muted-foreground', style: 'empty' };
    }

    if (totalFailures === 0) {
      return { content: '✓', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-600 dark:text-emerald-400', style: 'success' };
    }

    const content = totalFailures.toString();
    const worstStatus = challengeData.participants.reduce<'success' | 'warning' | 'danger'>((worst, p) => {
      if (p.status === 'danger') return 'danger';
      if (p.status === 'warning' && worst === 'success') return 'warning';
      return worst;
    }, 'success');
    
    switch (worstStatus) {
      case 'danger':
        return { content, bgColor: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-600 dark:text-red-400', style: 'danger' };
      case 'warning':
        return { content, bgColor: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-600 dark:text-amber-400', style: 'warning' };
      default:
        return { content, bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-600 dark:text-emerald-400', style: 'success' };
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-primary/60 animate-pulse" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-gradient-to-r from-muted to-muted/50 rounded-lg animate-pulse" />
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className="h-12 bg-gradient-to-br from-muted to-muted/50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 20}ms` }} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timelineData?.weeklyData || timelineData.weeklyData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t[lang].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-muted-foreground">{t[lang].noData}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gridCols = `minmax(200px, 1fr) repeat(${timelineData.weeklyData.length}, minmax(60px, 80px)) minmax(120px, 150px)`;

  return (
    <>
      <Card className="w-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-primary/60" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[600px]">
            <TooltipProvider>
              <div className="min-w-fit p-4">
                {/* Sticky Header Row */}
                <motion.div 
                  className="grid gap-1 mb-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 -my-2" 
                  style={{ gridTemplateColumns: gridCols }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-3 font-semibold text-sm bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                    {t[lang].challenges}
                  </div>
                  {timelineData.weeklyData.map((week, index) => (
                    <motion.div 
                      key={week.weekNumber} 
                      className="p-3 text-center font-medium text-xs bg-gradient-to-br from-muted/50 to-muted/20 rounded-lg"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                    >
                      <div>{t[lang].week}</div>
                      <div className="font-bold">{week.weekNumber}</div>
                    </motion.div>
                  ))}
                  <div className="p-3 text-center font-semibold text-sm bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg text-amber-700 dark:text-amber-300">
                    💶 {t[lang].total}
                  </div>
                </motion.div>

                {/* Challenge Rows */}
                <div className="space-y-1">
                  {uniqueChallenges.map((challenge, challengeIndex) => {
                    if (!challenge) return null;

                    return (
                      <motion.div 
                        key={challenge.id} 
                        className="grid gap-1 items-center group hover:bg-muted/20 rounded-lg p-1 transition-colors duration-200" 
                        style={{ gridTemplateColumns: gridCols }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: challengeIndex * 0.05 }}
                      >
                        {/* Challenge Name (Sticky Left) */}
                        <div className="p-3 text-sm font-medium bg-gradient-to-r from-card to-card/80 rounded-lg border border-border/50 sticky left-0 z-5">
                          <div className="truncate" title={challenge.title}>
                            {challenge.title}
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {challenge.challenge_type === 'habit' ? '🎯' : '📊'} 
                            {challenge.challenge_type.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Week Cells */}
                        {timelineData.weeklyData.map((week, weekIndex) => {
                          const challengeData = week.challenges[challenge.id];
                          if (!challengeData) {
                            return (
                              <motion.div 
                                key={week.weekNumber} 
                                className="p-3 bg-muted/10 rounded-lg border border-transparent"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: (challengeIndex * 0.05) + (weekIndex * 0.01) }}
                              />
                            );
                          }

                          const { content, bgColor, textColor, style } = getCellContent(challengeData);

                          return (
                            <Tooltip key={week.weekNumber}>
                              <TooltipTrigger asChild>
                                <motion.div
                                  className={`p-3 text-center text-sm font-bold rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:shadow-lg hover:scale-105 hover:border-primary/20 ${bgColor} ${textColor} ${style === 'inactive' ? 'cursor-not-allowed' : ''}`}
                                  onClick={() => style !== 'inactive' && handleCellClick(challenge.id, week.weekNumber)}
                                  onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && style !== 'inactive') {
                                      e.preventDefault();
                                      handleCellClick(challenge.id, week.weekNumber);
                                    }
                                  }}
                                  tabIndex={style !== 'inactive' ? 0 : -1}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.2, delay: (challengeIndex * 0.05) + (weekIndex * 0.01) }}
                                  whileHover={style !== 'inactive' ? { scale: 1.05 } : {}}
                                  whileTap={style !== 'inactive' ? { scale: 0.95 } : {}}
                                >
                                  {content}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <div className="space-y-2 p-2">
                                  <div className="font-semibold flex items-center gap-2">
                                    <span>{challenge.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {t[lang].week} {week.weekNumber}
                                    </Badge>
                                  </div>
                                  {!challengeData.isActive ? (
                                    <div className="text-muted-foreground text-sm">
                                      {t[lang].inactive}
                                    </div>
                                  ) : challengeData.participants.length > 0 ? (
                                    <>
                                      <div className="text-sm font-medium flex items-center gap-1">
                                        👥 {t[lang].participants} ({challengeData.participants.length})
                                      </div>
                                      <div className="max-h-32 overflow-y-auto space-y-1">
                                        {challengeData.participants.map(participant => (
                                          <div key={participant.user_id} className="text-sm p-2 bg-muted/30 rounded border-l-2" style={{ borderLeftColor: participant.custom_color || 'transparent' }}>
                                            <div className="font-medium">{participant.display_name}</div>
                                            {participant.habitViolations > 0 && (
                                              <div className="text-red-600 dark:text-red-400 text-xs">
                                                🎯 {t[lang].habitViolations}: {participant.habitViolations}
                                              </div>
                                            )}
                                            {participant.kpiDeviations > 0 && (
                                              <div className="text-amber-600 dark:text-amber-400 text-xs">
                                                📊 {t[lang].kpiDeviations}: {participant.kpiDeviations}
                                              </div>
                                            )}
                                            {participant.totalPenalty > 0 && (
                                              <div className="text-xs font-medium">
                                                💶 {formatEUR(participant.totalPenalty)}
                                              </div>
                                            )}
                                            {participant.habitViolations === 0 && participant.kpiDeviations === 0 && (
                                              <div className="text-emerald-600 dark:text-emerald-400 text-xs">
                                                ✓ {t[lang].success}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                      {challengeData.weeklyTotalPenalty > 0 && (
                                        <div className="pt-2 border-t border-border/50 font-medium text-sm">
                                          💶 {t[lang].weekTotal}: {formatEUR(challengeData.weeklyTotalPenalty)}
                                        </div>
                                      )}
                                      <div className="text-xs text-muted-foreground">
                                        💡 {t[lang].clickForDetails}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-muted-foreground text-sm">
                                      {t[lang].noData}
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}

                        {/* Challenge Total */}
                        <motion.div 
                          className="p-3 text-center text-sm font-bold bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: challengeIndex * 0.05 }}
                        >
                          {formatEUR(challengeTotals[challenge.id] || 0)}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Bottom Total Row */}
                <motion.div 
                  className="grid gap-1 mt-4 pt-3 border-t border-border/50 sticky bottom-0 bg-background/95 backdrop-blur-sm z-10" 
                  style={{ gridTemplateColumns: gridCols }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <div className="p-3 font-bold text-sm bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                    💶 {t[lang].weekTotal}
                  </div>
                  {timelineData.weeklyData.map((week, index) => (
                    <motion.div 
                      key={week.weekNumber} 
                      className="p-3 text-center font-bold text-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + (index * 0.02) }}
                    >
                      {formatEUR(weekTotals[week.weekNumber.toString()] || 0)}
                    </motion.div>
                  ))}
                  <div className="p-3 text-center font-bold text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg">
                    {formatEUR(Object.values(weekTotals).reduce((sum, val) => sum + val, 0))}
                  </div>
                </motion.div>
              </div>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Modal */}
      {selectedDrilldown && (
        <WeekDrilldownModal
          data={selectedDrilldown}
          isOpen={!!selectedDrilldown}
          onClose={() => setSelectedDrilldown(null)}
          lang={lang}
        />
      )}
    </>
  );
};