import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, Users, AlertTriangle, Euro, TrendingUp, TrendingDown, Info } from "lucide-react";
import { formatEUR } from "@/lib/currency";
import { LineChart, Line, ResponsiveContainer, ReferenceDot } from "recharts";
import { format, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";

interface KPIStripProps {
  data: {
    challenges: any[];
    stats: {
      totalChallenges: number;
      uniqueParticipants: number;
      totalPenalties: number;
    };
  };
  dateRange: { start: Date; end: Date };
  lang: 'de' | 'en';
  onKPIClick?: (kpi: string) => void;
}

export function KPIStrip({ data, dateRange, lang, onKPIClick }: KPIStripProps) {
  const [hoveredKPI, setHoveredKPI] = useState<string | null>(null);

  const t = {
    de: {
      totalChallenges: "Challenges",
      participants: "Teilnehmer", 
      fails: "Fails",
      penalties: "Strafen",
      vsSelectedPeriod: "Letzte KW vs. Ø restlicher Zeitraum",
      clickToFilter: "Klicken zum Filtern",
      lastWeek: "Letzte KW der Auswahl",
      periodAverage: "Ø restlicher Zeitraum",
      challengesInfo: "Aktive Challenges pro Woche im ausgewählten Zeitraum",
      participantsInfo: "Eindeutige Teilnehmer pro Woche im ausgewählten Zeitraum", 
      failsInfo: "Gesamte Verstöße (Gewohnheiten + KPI-Verfehlungen) pro Woche",
      penaltiesInfo: "Gesamtsumme der Strafen pro Woche in Euro",
      improvementNote: "Weniger ist besser",
      growthNote: "Mehr ist besser"
    },
    en: {
      totalChallenges: "Challenges",
      participants: "Participants",
      fails: "Fails", 
      penalties: "Penalties",
      vsSelectedPeriod: "Last week vs. Ø remaining period",
      clickToFilter: "Click to filter",
      lastWeek: "Last week of selection",
      periodAverage: "Ø remaining period",
      challengesInfo: "Active challenges per week in selected period",
      participantsInfo: "Unique participants per week in selected period",
      failsInfo: "Total violations (habits + KPI misses) per week",
      penaltiesInfo: "Total penalty amount per week in Euro",
      improvementNote: "Lower is better",
      growthNote: "Higher is better"
    }
  };

  // Calculate weekly data for sparklines
  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval(dateRange, { weekStartsOn: 1 });
    
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      
      // Filter challenges active in this week
      const weekChallenges = data.challenges.filter(challenge => 
        challenge.start_date <= weekEndStr && challenge.end_date >= weekStartStr
      );
      
      // Count unique participants in this week
      const weekParticipants = new Set(
        weekChallenges.flatMap(c => c.participants.map((p: any) => p.user_id))
      ).size;
      
      // Count ALL violations (habits + KPI misses) in this week
      const weekViolations = weekChallenges.reduce((sum, challenge) => {
        // Regular violations 
        const regularViolations = challenge.violations?.filter((v: any) => 
          v.date >= weekStartStr && v.date <= weekEndStr
        ).length || 0;
        
        // KPI violations (if challenge has KPI data)
        const kpiViolations = challenge.kpi_data?.filter((kpi: any) => 
          kpi.date >= weekStartStr && kpi.date <= weekEndStr && !kpi.achieved
        ).length || 0;
        
        return sum + regularViolations + kpiViolations;
      }, 0);
      
      // Sum penalties in this week (amount_cents is already in cents, divide by 100 only once)
      const weekPenalties = weekChallenges.reduce((sum, challenge) => 
        sum + (challenge.violations?.filter((v: any) => v.date >= weekStartStr && v.date <= weekEndStr)
          .reduce((violSum: number, v: any) => violSum + (v.amount_cents || 0), 0) || 0), 0
      );
      
      return {
        week: format(weekStart, 'yyyy-MM-dd'),
        challenges: weekChallenges.length,
        participants: weekParticipants,
        fails: weekViolations,
        penalties: weekPenalties // Keep in cents for now
      };
    });
  }, [data, dateRange]);

  // Calculate deltas with correct positive/negative logic
  const calculateDelta = (
    currentWeek: number, 
    periodAverage: number, 
    lowerIsBetter: boolean = false
  ): { value: number; isPositive: boolean; comparison: string; absoluteComparison: string } => {
    if (periodAverage === 0 && currentWeek === 0) {
      return { value: 0, isPositive: true, comparison: "0 vs Ø 0", absoluteComparison: "0 vs Ø 0" };
    }
    
    if (periodAverage === 0) {
      return { 
        value: 100, 
        isPositive: !lowerIsBetter, 
        comparison: `${currentWeek.toFixed(1)} vs Ø 0`,
        absoluteComparison: `${currentWeek.toFixed(1)} vs Ø 0`
      };
    }
    
    const delta = ((currentWeek - periodAverage) / periodAverage) * 100;
    const actualImprovement = lowerIsBetter ? delta < 0 : delta > 0;
    
    return { 
      value: Math.abs(delta), 
      isPositive: actualImprovement,
      comparison: `${currentWeek.toFixed(1)} vs Ø ${periodAverage.toFixed(1)}`,
      absoluteComparison: `${currentWeek.toFixed(1)} vs Ø ${periodAverage.toFixed(1)}`
    };
  };

  const lastWeekData = weeklyData[weeklyData.length - 1] || { challenges: 0, participants: 0, fails: 0, penalties: 0 };
  
  // Calculate averages for the rest of the period (excluding last week)
  const restOfPeriod = weeklyData.slice(0, -1);
  const periodAverages = {
    challenges: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.challenges, 0) / restOfPeriod.length : 0,
    participants: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.participants, 0) / restOfPeriod.length : 0,
    fails: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.fails, 0) / restOfPeriod.length : 0,
    penalties: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.penalties, 0) / restOfPeriod.length : 0
  };

  const deltas = {
    challenges: calculateDelta(lastWeekData.challenges, periodAverages.challenges, false), // Higher is better
    participants: calculateDelta(lastWeekData.participants, periodAverages.participants, false), // Higher is better
    fails: calculateDelta(lastWeekData.fails, periodAverages.fails, true), // Lower is better
    penalties: calculateDelta(lastWeekData.penalties / 100, periodAverages.penalties / 100, true) // Lower is better
  };

  const kpis = [
    {
      key: 'challenges',
      title: t[lang].totalChallenges,
      value: data.stats.totalChallenges,
      icon: Target,
      color: 'text-primary',
      data: weeklyData.map((w, i) => ({ value: w.challenges, week: i })),
      delta: deltas.challenges,
      info: t[lang].challengesInfo,
      trend: t[lang].growthNote
    },
    {
      key: 'participants', 
      title: t[lang].participants,
      value: data.stats.uniqueParticipants,
      icon: Users,
      color: 'text-blue-500',
      data: weeklyData.map((w, i) => ({ value: w.participants, week: i })),
      delta: deltas.participants,
      info: t[lang].participantsInfo,
      trend: t[lang].growthNote
    },
    {
      key: 'fails',
      title: t[lang].fails,
      value: data.challenges.reduce((sum, c) => sum + (c.violationCount || 0), 0),
      icon: AlertTriangle,
      color: 'text-orange-500',
      data: weeklyData.map((w, i) => ({ value: w.fails, week: i })),
      delta: deltas.fails,
      info: t[lang].failsInfo,
      trend: t[lang].improvementNote
    },
    {
      key: 'penalties',
      title: t[lang].penalties,
      value: formatEUR(data.stats.totalPenalties),
      icon: Euro,
      color: 'text-red-500',
      data: weeklyData.map((w, i) => ({ value: w.penalties / 100, week: i })),
      delta: deltas.penalties,
      isMonetary: true,
      info: t[lang].penaltiesInfo,
      trend: t[lang].improvementNote
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const DeltaIcon = kpi.delta.isPositive ? TrendingUp : TrendingDown;
        const isHovered = hoveredKPI === kpi.key;
        
        // Traffic light color system for deltas
        const deltaColorClass = kpi.delta.isPositive 
          ? 'text-emerald-600 dark:text-emerald-400' 
          : 'text-red-600 dark:text-red-400';
        
        const deltaBackgroundClass = kpi.delta.isPositive
          ? 'bg-emerald-50 dark:bg-emerald-950/30'
          : 'bg-red-50 dark:bg-red-950/30';

        return (
          <Card 
            key={kpi.key}
            className="group relative cursor-pointer transition-all duration-300 ease-out
                     hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10
                     border-0 bg-gradient-to-br from-card via-card to-muted/10
                     overflow-hidden"
            onClick={() => onKPIClick?.(kpi.key)}
            onMouseEnter={() => setHoveredKPI(kpi.key)}
            onMouseLeave={() => setHoveredKPI(null)}
          >
            {/* Gradient overlay that appears on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <CardContent className="relative p-6">
              {/* Header with icon, info button, and delta */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.delta.isPositive ? 'from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900' : 'from-red-100 to-red-50 dark:from-red-950 dark:to-red-900'}`}>
                    <Icon className={`h-5 w-5 ${kpi.color} transition-transform duration-200 group-hover:scale-110`} />
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">{kpi.info}</p>
                          <p className="text-xs opacity-75">{kpi.trend}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Delta indicator */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${deltaBackgroundClass} transition-all duration-200`}>
                  <DeltaIcon className={`h-3 w-3 ${deltaColorClass}`} />
                  <span className={`text-xs font-semibold ${deltaColorClass}`}>
                    {kpi.delta.isPositive ? '+' : ''}{kpi.delta.value.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Title and Value */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                    {kpi.title}
                  </p>
                </div>
                <p className="text-3xl font-bold tracking-tight leading-none">
                  {kpi.value}
                </p>
              </div>
              
              {/* Enhanced sparkline with hover effects */}
              <div className="mt-6 h-12 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpi.data}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={kpi.delta.isPositive ? 'hsl(var(--emerald-500))' : 'hsl(var(--red-500))'}
                      strokeWidth={isHovered ? 3 : 2}
                      dot={false}
                      activeDot={{ 
                        r: isHovered ? 4 : 0, 
                        stroke: kpi.delta.isPositive ? 'hsl(var(--emerald-500))' : 'hsl(var(--red-500))',
                        strokeWidth: 2,
                        fill: 'white'
                      }}
                    />
                    {isHovered && kpi.data.length > 0 && (
                      <ReferenceDot 
                        x={kpi.data.length - 1} 
                        y={kpi.data[kpi.data.length - 1]?.value} 
                        r={6} 
                        fill={kpi.delta.isPositive ? 'hsl(var(--emerald-500))' : 'hsl(var(--red-500))'}
                        stroke="white"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Comparison tooltip on card hover */}
              {isHovered && (
                <TooltipProvider>
                  <Tooltip open={true}>
                    <TooltipTrigger asChild>
                      <div className="absolute bottom-0 left-0 w-full h-1" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">{t[lang].vsSelectedPeriod}</p>
                        <div className="space-y-1">
                          <p className="flex justify-between">
                            <span>{t[lang].lastWeek}:</span>
                            <span className="font-mono">
                              {kpi.isMonetary 
                                ? formatEUR(lastWeekData[kpi.key === 'penalties' ? 'penalties' : kpi.key] / (kpi.key === 'penalties' ? 100 : 1))
                                : lastWeekData[kpi.key === 'challenges' ? 'challenges' : kpi.key === 'participants' ? 'participants' : kpi.key === 'fails' ? 'fails' : 'penalties']
                              }
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span>{t[lang].periodAverage}:</span>
                            <span className="font-mono">
                              {kpi.isMonetary 
                                ? formatEUR(periodAverages[kpi.key === 'penalties' ? 'penalties' : kpi.key] / (kpi.key === 'penalties' ? 100 : 1))
                                : Math.round(periodAverages[kpi.key === 'challenges' ? 'challenges' : kpi.key === 'participants' ? 'participants' : kpi.key === 'fails' ? 'fails' : 'penalties'])
                              }
                            </span>
                          </p>
                          <div className={`mt-2 p-2 rounded ${deltaBackgroundClass}`}>
                            <p className={`text-center font-semibold ${deltaColorClass}`}>
                              {kpi.delta.isPositive ? '+' : ''}{kpi.delta.value.toFixed(1)}% {lang === 'de' ? 'Veränderung' : 'Change'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}