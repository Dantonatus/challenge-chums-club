import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, differenceInDays } from "date-fns";
import { TrendingUp, Target, Euro, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BestROIProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
}

interface ROIChallengePoint {
  id: string;
  name: string;
  type: 'Habit' | 'KPI';
  failRatePct: number;
  penaltyImpactEUR: number;
  totalPenaltiesEUR: number;
  participants: number;
}

interface ROIMetrics {
  challengeId: string;
  title: string;
  failRate: number;
  penaltyImpact: number;
  participants: number;
  totalFails: number;
  totalPenalties: number;
  roi: number;
  challengeType: 'habit' | 'kpi';
}

export function BestROI({ lang, filters }: BestROIProps) {
  const { start, end } = useDateRange();
  const navigate = useNavigate();
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(['Habit', 'KPI']));

  const t = {
    de: {
      title: "Beste ROI Challenges",
      description: "Fehlerrate vs. Strafen-Impact",
      failRate: "Fehlerrate (%)",
      penaltyImpact: "Strafen-Impact (€)",
      participants: "Teilnehmer",
      totalPenalties: "Gesamt Strafen",
      noData: "Keine ROI-Daten verfügbar",
      habit: "Habit",
      kpi: "KPI"
    },
    en: {
      title: "Best ROI Challenges",
      description: "Fail Rate vs. Penalty Impact", 
      failRate: "Fail Rate (%)",
      penaltyImpact: "Penalty Impact (€)",
      participants: "Participants",
      totalPenalties: "Total Penalties",
      noData: "No ROI data available",
      habit: "Habit",
      kpi: "KPI"
    }
  };

  const { data: roiData, isLoading } = useQuery({
    queryKey: ['best-roi', start, end, filters],
    queryFn: async () => {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Get user's groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (!userGroups?.length) return [];

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
          penalty_cents
        `)
        .in('group_id', groupIds)
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      if (!challenges?.length) return [];

      const challengeIds = challenges.map(c => c.id);

      // Get participants
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('challenge_id, user_id')
        .in('challenge_id', challengeIds);

      // Get violations
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, created_at, amount_cents')
        .in('challenge_id', challengeIds)
        .gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`);

      // Calculate ROI metrics for each challenge
      const roiMetrics: ROIMetrics[] = challenges.map(challenge => {
        const challengeParticipants = participants?.filter(p => p.challenge_id === challenge.id) || [];
        const challengeViolations = violations?.filter(v => v.challenge_id === challenge.id) || [];

        // Calculate active days in range
        const challengeStart = new Date(challenge.start_date);
        const challengeEnd = new Date(challenge.end_date);
        const rangeStart = new Date(Math.max(start.getTime(), challengeStart.getTime()));
        const rangeEnd = new Date(Math.min(end.getTime(), challengeEnd.getTime()));
        const activeDays = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1);

        // Calculate metrics
        const totalFails = challengeViolations.length;
        const participantCount = challengeParticipants.length;
        const totalPenalties = challengeViolations.reduce((sum, v) => sum + (v.amount_cents || 0), 0);

        // Fail rate as percentage (normalized to weekly)
        const possibleFails = participantCount * activeDays;
        const rawFailRate = possibleFails > 0 ? (totalFails / possibleFails) : 0;
        const weeklyFailRate = Math.min(100, rawFailRate * 7 * 100); // Cap at 100%

        // Penalty impact: average penalty per fail in EUR
        const avgPenaltyPerFail = totalFails > 0 ? totalPenalties / totalFails : challenge.penalty_cents;
        const penaltyImpactEUR = avgPenaltyPerFail / 100; // Convert cents to EUR

        return {
          challengeId: challenge.id,
          title: challenge.title,
          failRate: Math.round(weeklyFailRate * 10) / 10,
          penaltyImpact: Math.round(penaltyImpactEUR * 100) / 100,
          participants: participantCount,
          totalFails,
          totalPenalties,
          roi: Math.round((penaltyImpactEUR / Math.max(0.1, weeklyFailRate / 10)) * 100) / 100,
          challengeType: challenge.challenge_type
        };
      }).filter(c => c.participants > 0);

      // Sort by ROI (descending)
      return roiMetrics.sort((a, b) => b.roi - a.roi);
    },
    enabled: !!start && !!end
  });

  // Convert to chart data with proper bubble sizing
  const chartData = useMemo(() => {
    if (!roiData?.length) return [];

    const points: ROIChallengePoint[] = roiData.map(challenge => ({
      id: challenge.challengeId,
      name: challenge.title,
      type: challenge.challengeType === 'habit' ? 'Habit' : 'KPI',
      failRatePct: challenge.failRate,
      penaltyImpactEUR: challenge.penaltyImpact,
      totalPenaltiesEUR: challenge.totalPenalties / 100, // Convert cents to EUR
      participants: challenge.participants
    }));

    // Log sample for debugging
    if (points.length > 0) {
      console.log('Sample ROI point:', points[0]);
    }

    return points;
  }, [roiData]);

  // Calculate bubble sizing
  const bubbleScaling = useMemo(() => {
    if (!chartData.length) return { rOf: () => 8 };
    
    const amounts = chartData.map(d => d.totalPenaltiesEUR);
    const maxA = Math.max(0, ...amounts);
    const minA = Math.min(...amounts);
    const rMin = 8;
    const rMax = 32;
    
    // Area scaling: area ∝ amount, so radius ∝ √amount
    const k = maxA > 0 ? (rMax / Math.sqrt(maxA)) : 0;
    const rOf = (amount: number) => {
      if (amount <= 0) return rMin;
      return Math.max(rMin, k * Math.sqrt(amount));
    };

    return { rOf, maxA, minA, k };
  }, [chartData]);

  // Filter data based on legend toggles
  const filteredData = useMemo(() => {
    return chartData.filter(item => visibleTypes.has(item.type));
  }, [chartData, visibleTypes]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }, [lang]);

  const handleBubbleClick = useCallback((data: any) => {
    if (data && data.id) {
      navigate(`/challenges/${data.id}`);
    }
  }, [navigate]);

  const toggleType = useCallback((type: string) => {
    setVisibleTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // Pastel colors
  const getPastelColor = (type: 'Habit' | 'KPI') => {
    return type === 'Habit' ? '#7dd3fc' : '#a7f3d0'; // sky-300 : emerald-200
  };

  // Custom bubble node
  const CustomNode = ({ cx, cy, payload }: any) => {
    const r = bubbleScaling.rOf(payload.totalPenaltiesEUR);
    const color = getPastelColor(payload.type);
    
    return (
      <g 
        tabIndex={0} 
        role="button" 
        aria-label={`${payload.name}, ${payload.failRatePct}% fails, ${formatCurrency(payload.penaltyImpactEUR)} impact, ${formatCurrency(payload.totalPenaltiesEUR)} total`}
        className="cursor-pointer focus:outline-none"
        onClick={() => handleBubbleClick(payload)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBubbleClick(payload);
          }
        }}
      >
        <circle 
          cx={cx} 
          cy={cy} 
          r={r} 
          fill={color} 
          fillOpacity={0.85} 
          stroke="rgba(0,0,0,0.08)" 
          strokeWidth={1}
          className="transition-all duration-200 hover:drop-shadow-lg motion-reduce:transition-none"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))'
          }}
        />
        <circle 
          cx={cx} 
          cy={cy} 
          r={r * 1.1} 
          fill="transparent" 
          className="opacity-0 hover:opacity-20 transition-opacity duration-200"
          style={{
            fill: color
          }}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-semibold text-foreground">{data.name}</h4>
            <Badge 
              variant="outline" 
              className={`text-xs border-0 ${
                data.type === 'Habit' 
                  ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-700 dark:from-cyan-950/30 dark:to-sky-950/30 dark:text-cyan-300'
                  : 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 dark:from-emerald-950/30 dark:to-green-950/30 dark:text-emerald-300'
              }`}
            >
              {t[lang][data.type.toLowerCase() as keyof typeof t[typeof lang]]}
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">{t[lang].failRate}:</span>
              <span className="font-medium">{data.failRatePct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-red-500" />
              <span className="text-muted-foreground">{t[lang].penaltyImpact}:</span>
              <span className="font-medium">{formatCurrency(data.penaltyImpactEUR)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-purple-500" />
              <span className="text-muted-foreground">{t[lang].totalPenalties}:</span>
              <span className="font-medium">{formatCurrency(data.totalPenaltiesEUR)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">{t[lang].participants}:</span>
              <span className="font-medium">{data.participants}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="animate-fade-in bg-gradient-to-br from-background/80 via-background to-background/60 backdrop-blur-sm shadow-lg border-0 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-emerald-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="animate-fade-in bg-gradient-to-br from-background/80 via-background to-background/60 backdrop-blur-sm shadow-lg border-0 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-emerald-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-muted-foreground">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t[lang].noData}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in bg-gradient-to-br from-background/80 via-background to-background/60 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-300 motion-reduce:hover:shadow-lg">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-emerald-500" />
            {t[lang].title}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{t[lang].description}</p>
        
        {/* Legend */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleType('Habit')}
            className={`h-auto px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              visibleTypes.has('Habit')
                ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-700 border border-cyan-200 shadow-sm dark:from-cyan-950/30 dark:to-sky-950/30 dark:text-cyan-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#7dd3fc' }} />
            {t[lang].habit}
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => toggleType('KPI')}
            className={`h-auto px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              visibleTypes.has('KPI')
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm dark:from-emerald-950/30 dark:to-green-950/30 dark:text-emerald-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#a7f3d0' }} />
            {t[lang].kpi}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer config={{}} className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              data={filteredData}
              margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
            >
              <CartesianGrid 
                stroke="hsl(var(--border))" 
                strokeDasharray="2 2" 
                opacity={0.3}
              />
              <XAxis 
                type="number" 
                dataKey="failRatePct"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: t[lang].failRate, 
                  position: 'insideBottom', 
                  offset: -10,
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: '12px', fontWeight: 500 }
                }}
              />
              <YAxis 
                type="number" 
                dataKey="penaltyImpactEUR"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => formatCurrency(value)}
                label={{ 
                  value: t[lang].penaltyImpact, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: '12px', fontWeight: 500 }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                name="Challenges" 
                data={filteredData}
                shape={<CustomNode />}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}