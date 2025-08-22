import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format } from "date-fns";
import { DollarSign, TrendingUp, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MoneyBurnersProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
}

interface ChallengeFinancials {
  challengeId: string;
  title: string;
  totalPenalties: number;
  participantCount: number;
  violationCount: number;
  avgPenaltyPerFail: number;
}

export function MoneyBurners({ lang, filters }: MoneyBurnersProps) {
  const { start, end } = useDateRange();

  const t = {
    de: {
      title: "Größte Geldverbrenner",
      description: "Challenges sortiert nach Gesamtstrafen",
      totalPenalties: "Gesamtstrafen",
      participants: "Teilnehmer",
      violations: "Verstöße",
      avgPenalty: "Ø Strafe",
      noData: "Keine Strafen im gewählten Zeitraum",
      perFail: "pro Fail"
    },
    en: {
      title: "Biggest Money Burners",
      description: "Challenges sorted by total penalties",
      totalPenalties: "Total Penalties",
      participants: "Participants", 
      violations: "Violations",
      avgPenalty: "Avg Penalty",
      noData: "No penalties in selected period",
      perFail: "per fail"
    }
  };

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['money-burners', start, end, filters],
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
          end_date
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

      // Get violations with amounts
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, created_at, amount_cents')
        .in('challenge_id', challengeIds)
        .gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`);

      // Calculate financial metrics for each challenge
      const challengeFinancials: ChallengeFinancials[] = challenges.map(challenge => {
        const challengeParticipants = participants?.filter(p => p.challenge_id === challenge.id) || [];
        const challengeViolations = violations?.filter(v => v.challenge_id === challenge.id) || [];

        const totalPenalties = challengeViolations.reduce((sum, v) => sum + (v.amount_cents || 0), 0);
        const violationCount = challengeViolations.length;
        const avgPenaltyPerFail = violationCount > 0 ? totalPenalties / violationCount : 0;

        return {
          challengeId: challenge.id,
          title: challenge.title,
          totalPenalties,
          participantCount: challengeParticipants.length,
          violationCount,
          avgPenaltyPerFail
        };
      }).filter(c => c.totalPenalties > 0);

      // Sort by total penalties (descending)
      return challengeFinancials.sort((a, b) => b.totalPenalties - a.totalPenalties);
    },
    enabled: !!start && !!end
  });

  const chartData = useMemo(() => {
    if (!financialData?.length) return [];
    
    // Take top 6 challenges for better visualization
    return financialData.slice(0, 6).map(challenge => ({
      name: challenge.title.length > 15 ? challenge.title.substring(0, 15) + '...' : challenge.title,
      fullName: challenge.title,
      amount: challenge.totalPenalties / 100, // Convert to euros
      totalPenalties: challenge.totalPenalties,
      participants: challenge.participantCount,
      violations: challenge.violationCount,
      avgPenalty: challenge.avgPenaltyPerFail / 100
    }));
  }, [financialData]);

  const totalBurned = useMemo(() => {
    return financialData?.reduce((sum, c) => sum + c.totalPenalties, 0) || 0;
  }, [financialData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs">💶</span>
              <span className="font-semibold text-red-600">€{data.amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span>{t[lang].violations}: {data.violations}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-green-500" />
              <span>{t[lang].avgPenalty}: €{data.avgPenalty.toFixed(2)} {t[lang].perFail}</span>
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
            <Flame className="w-5 h-5 text-red-500" />
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
            <Flame className="w-5 h-5 text-red-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
            <Flame className="w-5 h-5 text-red-500" />
            {t[lang].title}
          </CardTitle>
          
          {/* Total burned badge */}
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200">
            💸 €{(totalBurned / 100).toFixed(2)}
          </Badge>
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
                  value: `${t[lang].totalPenalties} (€)`, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount"
                fill="url(#moneyGradient)"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity duration-200"
              />
              <defs>
                <linearGradient id="moneyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={1}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}