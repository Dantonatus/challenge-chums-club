import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, Users, AlertTriangle, Euro, TrendingUp, TrendingDown } from "lucide-react";
import { formatEUR } from "@/lib/currency";
import { LineChart, Line, ResponsiveContainer } from "recharts";
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
  const t = {
    de: {
      totalChallenges: "Challenges",
      participants: "Teilnehmer", 
      fails: "Fails",
      penalties: "Strafen",
      vsCurrentWeek: "Aktuelle Woche vs. Ø Zeitraum",
      clickToFilter: "Klicken zum Filtern",
      currentWeek: "Aktuelle Woche",
      periodAverage: "Ø Zeitraum"
    },
    en: {
      totalChallenges: "Challenges",
      participants: "Participants",
      fails: "Fails", 
      penalties: "Penalties",
      vsCurrentWeek: "Current week vs. Ø period",
      clickToFilter: "Click to filter",
      currentWeek: "Current week",
      periodAverage: "Ø Period"
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
      
      // Count violations in this week
      const weekViolations = weekChallenges.reduce((sum, challenge) => 
        sum + challenge.violations.filter((v: any) => 
          v.date >= weekStartStr && v.date <= weekEndStr
        ).length, 0
      );
      
      // Sum penalties in this week
      const weekPenalties = weekChallenges.reduce((sum, challenge) => 
        sum + challenge.violations
          .filter((v: any) => v.date >= weekStartStr && v.date <= weekEndStr)
          .reduce((violSum: number, v: any) => violSum + v.amount_cents, 0), 0
      );
      
      return {
        week: format(weekStart, 'yyyy-MM-dd'),
        challenges: weekChallenges.length,
        participants: weekParticipants,
        fails: weekViolations,
        penalties: weekPenalties
      };
    });
  }, [data, dateRange]);

  // Calculate deltas: current week vs average of rest of period
  const calculateDelta = (currentWeek: number, periodAverage: number): { value: number; isPositive: boolean; comparison: string } => {
    if (periodAverage === 0) return { value: 0, isPositive: true, comparison: "0" };
    const delta = ((currentWeek - periodAverage) / periodAverage) * 100;
    return { 
      value: Math.abs(delta), 
      isPositive: delta >= 0,
      comparison: `${currentWeek.toFixed(1)} vs Ø ${periodAverage.toFixed(1)}`
    };
  };

  const currentWeekData = weeklyData[weeklyData.length - 1] || { challenges: 0, participants: 0, fails: 0, penalties: 0 };
  
  // Calculate averages for the rest of the period (excluding current week)
  const restOfPeriod = weeklyData.slice(0, -1);
  const periodAverages = {
    challenges: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.challenges, 0) / restOfPeriod.length : 0,
    participants: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.participants, 0) / restOfPeriod.length : 0,
    fails: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.fails, 0) / restOfPeriod.length : 0,
    penalties: restOfPeriod.length > 0 ? restOfPeriod.reduce((sum, w) => sum + w.penalties, 0) / restOfPeriod.length : 0
  };

  const deltas = {
    challenges: calculateDelta(currentWeekData.challenges, periodAverages.challenges),
    participants: calculateDelta(currentWeekData.participants, periodAverages.participants), 
    fails: calculateDelta(currentWeekData.fails, periodAverages.fails),
    penalties: calculateDelta(currentWeekData.penalties / 100, periodAverages.penalties / 100)
  };

  const kpis = [
    {
      key: 'challenges',
      title: t[lang].totalChallenges,
      value: data.stats.totalChallenges,
      icon: Target,
      color: 'text-primary',
      data: weeklyData.map(w => ({ value: w.challenges })),
      delta: deltas.challenges
    },
    {
      key: 'participants', 
      title: t[lang].participants,
      value: data.stats.uniqueParticipants,
      icon: Users,
      color: 'text-accent',
      data: weeklyData.map(w => ({ value: w.participants })),
      delta: deltas.participants
    },
    {
      key: 'fails',
      title: t[lang].fails,
      value: data.challenges.reduce((sum, c) => sum + c.violationCount, 0),
      icon: AlertTriangle,
      color: 'text-destructive',
      data: weeklyData.map(w => ({ value: w.fails })),
      delta: deltas.fails
    },
    {
      key: 'penalties',
      title: t[lang].penalties,
      value: formatEUR(data.stats.totalPenalties / 100),
      icon: Euro,
      color: 'text-warning',
      data: weeklyData.map(w => ({ value: w.penalties / 100 })),
      delta: deltas.penalties,
      isMonetary: true
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const DeltaIcon = kpi.delta.isPositive ? TrendingUp : TrendingDown;
        
        return (
          <TooltipProvider key={kpi.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-0 bg-gradient-to-br from-background to-muted/20"
                  onClick={() => onKPIClick?.(kpi.key)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Icon className={`h-5 w-5 ${kpi.color}`} />
                      <div className="flex items-center gap-1 text-xs">
                        <DeltaIcon className={`h-3 w-3 ${kpi.delta.isPositive ? 'text-success' : 'text-destructive'}`} />
                        <span className={kpi.delta.isPositive ? 'text-success' : 'text-destructive'}>
                          {kpi.delta.isPositive ? '+' : ''}{kpi.delta.value.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {kpi.title}
                      </p>
                      <p className="text-2xl font-bold">
                        {kpi.value}
                      </p>
                    </div>
                    
                    {/* Mini sparkline */}
                    <div className="mt-4 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={kpi.data}>
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t[lang].clickToFilter}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">{t[lang].vsCurrentWeek}</p>
                  <p>{kpi.delta.comparison}</p>
                  <p className={kpi.delta.isPositive ? 'text-success' : 'text-destructive'}>
                    {kpi.delta.isPositive ? '+' : ''}{kpi.delta.value.toFixed(1)}% Veränderung
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}