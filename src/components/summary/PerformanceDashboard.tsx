import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, AlertTriangle, Euro, HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { formatEUR } from "@/lib/currency";
import { 
  RadialBarChart, 
  RadialBar, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  ReferenceDot 
} from "recharts";
import { eachWeekOfInterval, startOfWeek, endOfWeek, format } from "date-fns";
import { motion } from "framer-motion";

interface PerformanceDashboardProps {
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

const BASELINE_THRESHOLDS = {
  failsPerParticipantPerWeek: 1,
  penaltyPerParticipantPerWeek: 10 // EUR
};

export function PerformanceDashboard({ data, dateRange, lang, onKPIClick }: PerformanceDashboardProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const t = {
    de: {
      performanceIndex: "Performance Index",
      engagement: "Engagement",
      discipline: "Disziplin", 
      financialImpact: "Finanzielle Auswirkung",
      lastWeek: "Letzte KW",
      avgPrevious: "Ø Vorherige KWs",
      change: "Veränderung",
      pts: "Pkt",
      vs: "vs",
      performanceInfo: "Gewichteter Index basierend auf Engagement (20%), Disziplin (50%) und finanzieller Performance (30%). Höhere Werte sind besser.",
      engagementInfo: "Durchschnittliche Teilnehmer pro Woche vs. Gesamtteilnehmer im Zeitraum",
      disciplineInfo: "Verstöße (Gewohnheiten + KPI-Verfehlungen) pro Teilnehmer pro Woche",
      financialInfo: "Durchschnittliche Strafen pro Teilnehmer pro Woche in Euro",
      improvement: "Verbesserung",
      decline: "Verschlechterung"
    },
    en: {
      performanceIndex: "Performance Index",
      engagement: "Engagement",
      discipline: "Discipline",
      financialImpact: "Financial Impact", 
      lastWeek: "Last Week",
      avgPrevious: "Ø Previous Weeks",
      change: "Change",
      pts: "pts",
      vs: "vs",
      performanceInfo: "Weighted index based on engagement (20%), discipline (50%), and financial performance (30%). Higher values are better.",
      engagementInfo: "Average participants per week vs. total participants in period",
      disciplineInfo: "Violations (habits + KPI misses) per participant per week",
      financialInfo: "Average penalties per participant per week in Euro",
      improvement: "Improvement",
      decline: "Decline"
    }
  };

  // Calculate weekly data for all metrics
  const weeklyMetrics = useMemo(() => {
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
      const weekParticipantsSet = new Set(
        weekChallenges.flatMap(c => c.participants.map((p: any) => p.user_id))
      );
      const weekParticipants = weekParticipantsSet.size;
      
      // Count ALL violations (habits + KPI misses) in this week
      const weekViolations = weekChallenges.reduce((sum, challenge) => {
        // Regular violations 
        const regularViolations = challenge.violations?.filter((v: any) => 
          v.date >= weekStartStr && v.date <= weekEndStr
        ).length || 0;
        
        // KPI violations (missed targets)
        const kpiViolations = challenge.kpi_measurements?.filter((kpi: any) => 
          kpi.date >= weekStartStr && kpi.date <= weekEndStr && 
          kpi.measured_value < kpi.target_value
        ).length || 0;
        
        return sum + regularViolations + kpiViolations;
      }, 0);
      
      // Sum penalties in this week (regular violations + KPI penalty amounts)
      const weekPenalties = weekChallenges.reduce((sum, challenge) => {
        // Regular violation penalties
        const regularPenalties = challenge.violations?.filter((v: any) => 
          v.date >= weekStartStr && v.date <= weekEndStr
        ).reduce((violSum: number, v: any) => violSum + (v.amount_cents || 0), 0) || 0;
        
        // KPI miss penalties (assume challenge penalty_amount per miss)
        const kpiMisses = challenge.kpi_measurements?.filter((kpi: any) => 
          kpi.date >= weekStartStr && kpi.date <= weekEndStr && 
          kpi.measured_value < kpi.target_value
        ).length || 0;
        const kpiPenalties = kpiMisses * (challenge.penalty_amount || 0);
        
        return sum + regularPenalties + kpiPenalties;
      }, 0);
      
      return {
        week: format(weekStart, 'yyyy-MM-dd'),
        challenges: weekChallenges.length,
        participants: weekParticipants,
        fails: weekViolations,
        penalties: weekPenalties / 100, // Convert to EUR once
        engagedParticipants: weekParticipants
      };
    });
  }, [data, dateRange]);

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    if (weeklyMetrics.length === 0) {
      return {
        engagementRate: 0,
        avgFailRate: 0,
        avgPenaltyRate: 0,
        performanceIndex: 0,
        weeklyData: []
      };
    }

    const totalDistinctParticipants = new Set(
      data.challenges.flatMap(c => c.participants.map((p: any) => p.user_id))
    ).size;

    const avgEngagedParticipants = weeklyMetrics.reduce((sum, w) => sum + w.engagedParticipants, 0) / weeklyMetrics.length;
    const engagementRate = totalDistinctParticipants > 0 ? avgEngagedParticipants / totalDistinctParticipants : 0;

    const totalFails = weeklyMetrics.reduce((sum, w) => sum + w.fails, 0);
    const avgFailRate = (totalDistinctParticipants > 0 && weeklyMetrics.length > 0) 
      ? totalFails / (totalDistinctParticipants * weeklyMetrics.length) 
      : 0;

    const totalPenalties = weeklyMetrics.reduce((sum, w) => sum + w.penalties, 0);
    const avgPenaltyRate = (totalDistinctParticipants > 0 && weeklyMetrics.length > 0)
      ? totalPenalties / (totalDistinctParticipants * weeklyMetrics.length)
      : 0;

    // Calculate weighted performance index
    const failScore = Math.max(0, 1 - (avgFailRate / BASELINE_THRESHOLDS.failsPerParticipantPerWeek));
    const penaltyScore = Math.max(0, 1 - (avgPenaltyRate / BASELINE_THRESHOLDS.penaltyPerParticipantPerWeek));
    const engagementScore = Math.min(1, engagementRate); // Cap at 1

    const performanceIndex = (0.5 * failScore + 0.3 * penaltyScore + 0.2 * engagementScore) * 100;

    return {
      engagementRate: engagementRate * 100, // Convert to percentage
      avgFailRate,
      avgPenaltyRate,
      performanceIndex: Math.round(performanceIndex * 10) / 10, // Round to 1 decimal
      weeklyData: weeklyMetrics
    };
  }, [weeklyMetrics, data.challenges]);

  // Calculate deltas (last week vs previous weeks average)
  const deltas = useMemo(() => {
    if (weeklyMetrics.length < 2) {
      return {
        performance: { value: 0, isPositive: true },
        engagement: { value: 0, isPositive: true },
        discipline: { value: 0, isPositive: true },
        financial: { value: 0, isPositive: true }
      };
    }

    const lastWeek = weeklyMetrics[weeklyMetrics.length - 1];
    const previousWeeks = weeklyMetrics.slice(0, -1);

    // Calculate previous weeks averages
    const avgPreviousEngagement = previousWeeks.reduce((sum, w) => sum + w.participants, 0) / previousWeeks.length;
    const avgPreviousFails = previousWeeks.reduce((sum, w) => sum + w.fails, 0) / previousWeeks.length;
    const avgPreviousPenalties = previousWeeks.reduce((sum, w) => sum + w.penalties, 0) / previousWeeks.length;

    // Calculate last week performance index
    const totalDistinctParticipants = new Set(
      data.challenges.flatMap(c => c.participants.map((p: any) => p.user_id))
    ).size;

    const lastWeekEngagementRate = totalDistinctParticipants > 0 ? lastWeek.participants / totalDistinctParticipants : 0;
    const lastWeekFailRate = (totalDistinctParticipants > 0) ? lastWeek.fails / totalDistinctParticipants : 0;
    const lastWeekPenaltyRate = (totalDistinctParticipants > 0) ? lastWeek.penalties / totalDistinctParticipants : 0;

    const lastWeekFailScore = Math.max(0, 1 - (lastWeekFailRate / BASELINE_THRESHOLDS.failsPerParticipantPerWeek));
    const lastWeekPenaltyScore = Math.max(0, 1 - (lastWeekPenaltyRate / BASELINE_THRESHOLDS.penaltyPerParticipantPerWeek));
    const lastWeekEngagementScore = Math.min(1, lastWeekEngagementRate);
    const lastWeekPerformanceIndex = (0.5 * lastWeekFailScore + 0.3 * lastWeekPenaltyScore + 0.2 * lastWeekEngagementScore) * 100;

    // Calculate previous weeks average performance index
    const prevWeeksPerformanceIndices = previousWeeks.map(week => {
      const weekEngagementRate = totalDistinctParticipants > 0 ? week.participants / totalDistinctParticipants : 0;
      const weekFailRate = (totalDistinctParticipants > 0) ? week.fails / totalDistinctParticipants : 0;
      const weekPenaltyRate = (totalDistinctParticipants > 0) ? week.penalties / totalDistinctParticipants : 0;

      const weekFailScore = Math.max(0, 1 - (weekFailRate / BASELINE_THRESHOLDS.failsPerParticipantPerWeek));
      const weekPenaltyScore = Math.max(0, 1 - (weekPenaltyRate / BASELINE_THRESHOLDS.penaltyPerParticipantPerWeek));
      const weekEngagementScore = Math.min(1, weekEngagementRate);
      return (0.5 * weekFailScore + 0.3 * weekPenaltyScore + 0.2 * weekEngagementScore) * 100;
    });
    const avgPreviousPerformanceIndex = prevWeeksPerformanceIndices.reduce((sum, idx) => sum + idx, 0) / prevWeeksPerformanceIndices.length;

    const calculateDelta = (current: number, previous: number, higherIsBetter: boolean = true) => {
      if (previous === 0 && current === 0) return { value: 0, isPositive: true };
      if (previous === 0) return { value: 100, isPositive: higherIsBetter };
      
      const delta = ((current - previous) / previous) * 100;
      return {
        value: Math.abs(delta),
        isPositive: higherIsBetter ? delta > 0 : delta < 0
      };
    };

    return {
      performance: calculateDelta(lastWeekPerformanceIndex, avgPreviousPerformanceIndex, true),
      engagement: calculateDelta(lastWeek.participants, avgPreviousEngagement, true),
      discipline: calculateDelta(lastWeek.fails, avgPreviousFails, false), // Lower is better
      financial: calculateDelta(lastWeek.penalties, avgPreviousPenalties, false) // Lower is better
    };
  }, [weeklyMetrics, data.challenges]);

  // Performance Index Chart Data
  const performanceChartData = [
    {
      name: 'Performance',
      value: aggregateMetrics.performanceIndex,
      fill: `url(#performanceGradient)`
    }
  ];

  // Insight Cards Data
  const insightCards = [
    {
      key: 'engagement',
      title: t[lang].engagement,
      value: `${Math.round(aggregateMetrics.engagementRate)}%`,
      icon: Users,
      color: 'from-blue-500/20 to-blue-600/5',
      iconColor: 'text-blue-600 dark:text-blue-400',
      strokeColor: '#3B82F6',
      data: weeklyMetrics.map((w, i) => ({ value: w.participants, week: i })),
      delta: deltas.engagement,
      info: t[lang].engagementInfo,
      scrollTarget: 'participants-section'
    },
    {
      key: 'discipline',
      title: t[lang].discipline,
      value: aggregateMetrics.avgFailRate.toFixed(1),
      icon: AlertTriangle,
      color: 'from-rose-500/20 to-rose-600/5',
      iconColor: 'text-rose-600 dark:text-rose-400',
      strokeColor: '#EF4444',
      data: weeklyMetrics.map((w, i) => ({ value: w.fails, week: i })),
      delta: deltas.discipline,
      info: t[lang].disciplineInfo,
      scrollTarget: 'fails-section'
    },
    {
      key: 'financial',
      title: t[lang].financialImpact,
      value: formatEUR(Math.round(aggregateMetrics.avgPenaltyRate * 100)), // Convert back to cents for formatting
      icon: Euro,
      color: 'from-amber-500/20 to-amber-600/5',
      iconColor: 'text-amber-600 dark:text-amber-400',
      strokeColor: '#F59E0B',
      data: weeklyMetrics.map((w, i) => ({ value: w.penalties, week: i })),
      delta: deltas.financial,
      info: t[lang].financialInfo,
      scrollTarget: 'penalties-section'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Performance Index Card - Takes 2 columns on md+ */}
      <motion.div 
        className="md:col-span-2 lg:col-span-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card 
          className="group relative cursor-pointer transition-all duration-300 ease-out
                   hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10
                   border-0 bg-gradient-to-br from-background to-muted/20 rounded-2xl shadow-lg
                   overflow-hidden h-full"
          onMouseEnter={() => setHoveredCard('performance')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onKPIClick?.('performance')}
        >
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <CardContent className="relative p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
            {/* Info Icon */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="absolute top-4 right-4 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-sm">{t[lang].performanceInfo}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Radial Chart */}
            <div className="relative w-48 h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="90%" 
                  data={performanceChartData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <defs>
                    <linearGradient id="performanceGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="hsl(var(--warning))" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <RadialBar 
                    dataKey="value" 
                    cornerRadius={8}
                    className="transition-all duration-300"
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              
              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-foreground">
                  {aggregateMetrics.performanceIndex}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {t[lang].performanceIndex}
                </div>
                {deltas.performance.value > 0 && (
                  <div className={`flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-semibold
                    ${deltas.performance.isPositive 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'}`}
                  >
                    {deltas.performance.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {deltas.performance.isPositive ? '+' : ''}{deltas.performance.value.toFixed(1)}% {t[lang].vs} Ø
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insight Cards */}
      {insightCards.map((card, index) => {
        const Icon = card.icon;
        const isHovered = hoveredCard === card.key;
        const DeltaIcon = card.delta.isPositive ? TrendingUp : TrendingDown;
        
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * (index + 1) }}
          >
            <Card 
              className="group relative cursor-pointer transition-all duration-300 ease-out
                       hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10
                       border-0 rounded-xl overflow-hidden h-full"
              style={{ 
                background: `linear-gradient(135deg, ${card.color.split(' ')[0].replace('from-', '')}, ${card.color.split(' ')[1].replace('to-', '')})`
              }}
              onClick={() => {
                onKPIClick?.(card.key);
                document.getElementById(card.scrollTarget)?.scrollIntoView({ behavior: 'smooth' });
              }}
              onMouseEnter={() => setHoveredCard(card.key)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardContent className="relative p-6">
                {/* Header with icon and info */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br from-background/50 to-background/20`}>
                    <Icon className={`h-5 w-5 ${card.iconColor} transition-transform duration-200 group-hover:scale-110`} />
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">{card.info}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Title and Value */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                    {card.title}
                  </p>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold tracking-tight leading-none">
                      {card.value}
                    </p>
                    {/* Delta Badge */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
                      ${card.delta.isPositive 
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'}`}
                    >
                      <DeltaIcon className="h-3 w-3" />
                      {card.delta.isPositive ? '+' : ''}{card.delta.value.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* Sparkline */}
                <div className="mt-4 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={card.data}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={card.strokeColor}
                        strokeWidth={isHovered ? 3 : 2}
                        dot={false}
                        activeDot={{ 
                          r: isHovered ? 4 : 0, 
                          stroke: card.strokeColor,
                          strokeWidth: 2,
                          fill: 'white'
                        }}
                      />
                      {isHovered && card.data.length > 0 && (
                        <ReferenceDot 
                          x={card.data.length - 1} 
                          y={card.data[card.data.length - 1]?.value} 
                          r={6} 
                          fill={card.strokeColor}
                          stroke="white"
                          strokeWidth={2}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}