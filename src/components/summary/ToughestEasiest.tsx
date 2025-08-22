import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, differenceInDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { TrendingDown, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ToughestEasiestProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
}

interface ChallengeData {
  challengeId: string;
  title: string;
  failRate: number;
  participants: number;
  totalFails: number;
  totalPenalties: number;
  activeDays: number;
}

export function ToughestEasiest({ lang, filters }: ToughestEasiestProps) {
  const { start, end } = useDateRange();

  const t = {
    de: {
      title: "Härteste vs. Leichteste Challenges",
      description: "Ranking nach Fehlerrate (%)",
      failRate: "Fehlerrate",
      participants: "Teilnehmer", 
      totalFails: "Gesamt Fails",
      totalPenalties: "Gesamt Strafen",
      noData: "Keine Daten verfügbar",
      week: "pro Woche",
      toughest: "Härteste",
      easiest: "Leichteste"
    },
    en: {
      title: "Toughest vs. Easiest Challenges",
      description: "Ranked by fail rate (%)",
      failRate: "Fail Rate",
      participants: "Participants",
      totalFails: "Total Fails", 
      totalPenalties: "Total Penalties",
      noData: "No data available",
      week: "per week",
      toughest: "Toughest",
      easiest: "Easiest"
    }
  };

  const { data: challengeData, isLoading } = useQuery({
    queryKey: ['toughest-easiest', start, end, filters],
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

      // Calculate metrics for each challenge
      const challengeStats: ChallengeData[] = challenges.map(challenge => {
        const challengeParticipants = participants?.filter(p => p.challenge_id === challenge.id) || [];
        const challengeViolations = violations?.filter(v => v.challenge_id === challenge.id) || [];

        // Calculate active days in range
        const challengeStart = new Date(challenge.start_date);
        const challengeEnd = new Date(challenge.end_date);
        const rangeStart = new Date(Math.max(start.getTime(), challengeStart.getTime()));
        const rangeEnd = new Date(Math.min(end.getTime(), challengeEnd.getTime()));
        const activeDays = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1);

        // Calculate fail rate normalized to weekly scale
        const totalFails = challengeViolations.length;
        const participantCount = challengeParticipants.length;
        const possibleFails = participantCount * activeDays;
        const rawFailRate = possibleFails > 0 ? (totalFails / possibleFails) : 0;
        const weeklyFailRate = rawFailRate * 7 * 100; // Convert to weekly percentage

        const totalPenalties = challengeViolations.reduce((sum, v) => sum + (v.amount_cents || 0), 0);

        return {
          challengeId: challenge.id,
          title: challenge.title,
          failRate: Math.round(weeklyFailRate * 10) / 10, // Round to 1 decimal
          participants: participantCount,
          totalFails,
          totalPenalties,
          activeDays
        };
      }).filter(c => c.participants > 0);

      // Sort by fail rate (descending)
      return challengeStats.sort((a, b) => b.failRate - a.failRate);
    },
    enabled: !!start && !!end
  });

  const chartData = useMemo(() => {
    if (!challengeData?.length) return [];
    
    // Take top 8 challenges for better visualization
    return challengeData.slice(0, 8).map(challenge => ({
      name: challenge.title.length > 20 ? challenge.title.substring(0, 20) + '...' : challenge.title,
      fullName: challenge.title,
      failRate: challenge.failRate,
      participants: challenge.participants,
      totalFails: challenge.totalFails,
      totalPenalties: challenge.totalPenalties
    }));
  }, [challengeData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-red-500" />
              <span>{t[lang].failRate}: {data.failRate}% {t[lang].week}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-blue-500" />
              <span>{t[lang].participants}: {data.participants}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>{t[lang].totalFails}: {data.totalFails}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">💶</span>
              <span>{t[lang].totalPenalties}: €{(data.totalPenalties / 100).toFixed(2)}</span>
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
            <TrendingDown className="w-5 h-5 text-red-500" />
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
            <TrendingDown className="w-5 h-5 text-red-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  const toughestChallenge = chartData[0];
  const easiestChallenge = chartData[chartData.length - 1];

  return (
    <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-all duration-300">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            {t[lang].title}
          </CardTitle>
          
          {/* Summary badges */}
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200">
              🔥 {t[lang].toughest}: {toughestChallenge.failRate}%
            </Badge>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200">
              ✅ {t[lang].easiest}: {easiestChallenge.failRate}%
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t[lang].description}</p>
      </CardHeader>

      <CardContent>
        <ChartContainer config={{}} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              className="cursor-pointer"
            >
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: `${t[lang].failRate} (%)`, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="failRate" 
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity duration-200"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={index === 0 ? '#EF4444' : 
                         index === chartData.length - 1 ? '#10B981' : 
                         '#F59E0B'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}