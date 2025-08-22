import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip, ZAxis } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, differenceInDays } from "date-fns";
import { TrendingUp, Target, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BestROIProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
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
}

export function BestROI({ lang, filters }: BestROIProps) {
  const { start, end } = useDateRange();

  const t = {
    de: {
      title: "Beste ROI Challenges",
      description: "Fehlerrate vs. Strafenhöhe (Bubble = Teilnehmer)",
      failRate: "Fehlerrate (%)",
      penaltyImpact: "Strafen-Impact",
      participants: "Teilnehmer",
      roi: "ROI",
      noData: "Keine ROI-Daten verfügbar",
      excellent: "Exzellent",
      good: "Gut",
      poor: "Schlecht",
      totalFails: "Gesamt Fails"
    },
    en: {
      title: "Best ROI Challenges",
      description: "Fail rate vs. penalty impact (bubble = participants)",
      failRate: "Fail Rate (%)",
      penaltyImpact: "Penalty Impact",
      participants: "Participants",
      roi: "ROI",
      noData: "No ROI data available",
      excellent: "Excellent",
      good: "Good",
      poor: "Poor",
      totalFails: "Total Fails"
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
          roi: Math.round(roi * 100) / 100
        };
      }).filter(c => c.participants > 0);

      // Sort by ROI (descending)
      return roiMetrics.sort((a, b) => b.roi - a.roi);
    },
    enabled: !!start && !!end
  });

  const chartData = useMemo(() => {
    if (!roiData?.length) return [];
    
    return roiData.map(challenge => ({
      x: challenge.failRate,
      y: challenge.penaltyImpact,
      z: challenge.participants * 10, // Scale for bubble size
      name: challenge.title.length > 20 ? challenge.title.substring(0, 20) + '...' : challenge.title,
      fullName: challenge.title,
      failRate: challenge.failRate,
      penaltyImpact: challenge.penaltyImpact,
      participants: challenge.participants,
      totalFails: challenge.totalFails,
      totalPenalties: challenge.totalPenalties,
      roi: challenge.roi,
      // Color based on ROI performance
      fill: challenge.roi > 2 ? '#10B981' : challenge.roi > 1 ? '#F59E0B' : '#EF4444'
    }));
  }, [roiData]);

  const bestROI = roiData?.[0];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span>{t[lang].failRate}: {data.failRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-red-500" />
              <span>{t[lang].penaltyImpact}: {data.penaltyImpact}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3 text-green-500" />
              <span>{t[lang].participants}: {data.participants}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">📈</span>
              <span className="font-semibold">{t[lang].roi}: {data.roi}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-all duration-300">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            {t[lang].title}
          </CardTitle>
          
          {/* Best ROI badge */}
          {bestROI && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200">
              🎯 {t[lang].roi}: {bestROI.roi}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t[lang].description}</p>
      </CardHeader>

      <CardContent>
        <ChartContainer config={{}} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis 
                type="number" 
                dataKey="x"
                name={t[lang].failRate}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: t[lang].failRate, 
                  position: 'insideBottom', 
                  offset: -10,
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <YAxis 
                type="number" 
                dataKey="y"
                name={t[lang].penaltyImpact}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: t[lang].penaltyImpact, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 300]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                name="Challenges"
                data={chartData}
                className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* ROI Legend */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">{t[lang].excellent} ROI (2.0+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">{t[lang].good} ROI (1.0-2.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">{t[lang].poor} ROI (&lt;1.0)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}