import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip, ZAxis, Cell, CartesianGrid } from "recharts";
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
  failRatePct: number;
  penaltyImpactEUR: number;
  totalPenaltiesEUR: number;
  participants: number;
  type: 'Habit' | 'KPI';
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

        // Penalty impact: higher penalty per fail = higher impact, but clamped
        const avgPenaltyPerFail = totalFails > 0 ? totalPenalties / totalFails : challenge.penalty_cents;
        const penaltyImpact = Math.min(10, Math.max(0.1, avgPenaltyPerFail / 100)); // Scale to 0.1-10 range

        // ROI calculation: lower fail rate + reasonable penalty = better ROI
        const roi = penaltyImpact / Math.max(0.1, weeklyFailRate / 10); // Higher is better

        return {
          challengeId: challenge.id,
          title: challenge.title,
          failRate: Math.round(weeklyFailRate * 10) / 10,
          penaltyImpact: Math.round(penaltyImpact * 10) / 10,
          participants: participantCount,
          totalFails,
          totalPenalties,
          roi: Math.round(roi * 100) / 100,
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

    // Calculate bubble size scaling
    const amounts = roiData.map(d => d.totalPenalties);
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    
    // Define visual radius bounds
    const rMin = 8;
    const rMax = 32;
    
    // Calculate scaling factor for area-based sizing
    const calculateRadius = (amount: number) => {
      if (maxAmount === minAmount) return (rMin + rMax) / 2;
      
      // Area scaling: area ∝ amount, so radius ∝ √amount
      const normalizedSqrt = Math.sqrt((amount - minAmount) / (maxAmount - minAmount));
      return rMin + normalizedSqrt * (rMax - rMin);
    };
    
    return roiData.map(challenge => ({
      id: challenge.challengeId,
      name: challenge.title,
      failRatePct: challenge.failRate,
      penaltyImpactEUR: challenge.penaltyImpact,
      totalPenaltiesEUR: challenge.totalPenalties / 100, // Convert cents to EUR
      participants: challenge.participants,
      type: challenge.challengeType === 'habit' ? 'Habit' : 'KPI',
      bubbleSize: calculateRadius(challenge.totalPenalties),
      x: challenge.failRate,
      y: challenge.penaltyImpact,
      z: calculateRadius(challenge.totalPenalties) // For Recharts ZAxis
    }));
  }, [roiData]);

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-semibold text-foreground">{data.name}</h4>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                data.type === 'Habit' 
                  ? 'bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-700 border-cyan-200 dark:from-cyan-950/30 dark:to-teal-950/30 dark:text-cyan-300'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 dark:from-blue-950/30 dark:to-indigo-950/30 dark:text-blue-300'
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
                ? 'bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-700 border border-cyan-200 shadow-sm dark:from-cyan-950/30 dark:to-teal-950/30 dark:text-cyan-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 mr-2" />
            {t[lang].habit}
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => toggleType('KPI')}
            className={`h-auto px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              visibleTypes.has('KPI')
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm dark:from-blue-950/30 dark:to-indigo-950/30 dark:text-blue-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
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
                dataKey="x"
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
                dataKey="y"
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
              <ZAxis type="number" dataKey="z" range={[64, 1024]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter name="Challenges" data={filteredData}>
                {filteredData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.type === 'Habit' ? 'hsl(188, 85%, 65%)' : 'hsl(217, 85%, 65%)'} 
                    className="cursor-pointer hover:brightness-110 transition-all duration-200 motion-reduce:hover:brightness-100" 
                    style={{ 
                      filter: 'drop-shadow(0 2px 8px hsla(var(--primary), 0.15))',
                      transformOrigin: 'center'
                    }}
                    onClick={() => handleBubbleClick(entry)}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}