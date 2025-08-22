import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatEUR } from "@/lib/currency";
import { TrendingDown, TrendingUp } from "lucide-react";

interface ToughestVsEasiestChallengesProps {
  data: Array<{
    challenges: Array<{
      id: string;
      title: string;
      challenge_type: 'habit' | 'kpi';
      violations: Array<{ amount_cents: number }>;
      participants: Array<{ user_id: string; display_name: string }>;
      violationCount: number;
      totalViolationAmount: number;
      kpi_measurements?: Array<{ measured_value: number; target_value: number }>;
    }>;
  }>;
  lang: 'de' | 'en';
}

export const ToughestVsEasiestChallenges = ({ data, lang }: ToughestVsEasiestChallengesProps) => {
  const t = {
    de: {
      title: "Schwierigste vs. Leichteste Challenges",
      description: "Herausforderungen nach Fail-Rate sortiert",
      failRate: "Fail-Rate (%)",
      participants: "Teilnehmer",
      penalties: "Strafen",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Toughest vs. Easiest Challenges",
      description: "Challenges ranked by fail-rate",
      failRate: "Fail Rate (%)",
      participants: "Participants", 
      penalties: "Penalties",
      noData: "No challenges for the selected period"
    }
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const challengeStats = new Map();

    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        const key = challenge.id;
        const participantCount = challenge.participants?.length || 0;
        const violationCount = challenge.violationCount || 0;
        
        // Calculate fail rate as percentage
        const failRate = participantCount > 0 ? Math.round((violationCount / participantCount) * 100) : 0;
        
        challengeStats.set(key, {
          name: challenge.title.length > 15 ? challenge.title.substring(0, 15) + '...' : challenge.title,
          fullName: challenge.title,
          type: challenge.challenge_type,
          failRate,
          participants: participantCount,
          totalPenalties: (challenge.totalViolationAmount || 0) / 100,
          violations: violationCount
        });
      });
    });

    return Array.from(challengeStats.values())
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 8); // Top 8 for better readability
  }, [data]);

  const chartConfig = {
    failRate: {
      label: t[lang].failRate,
      color: "hsl(var(--chart-1))",
    },
  };

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-chart-1" />
            <CardTitle className="text-lg">{t[lang].title}</CardTitle>
          </div>
          <CardDescription>{t[lang].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300 hover-scale">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-chart-1" />
          <CardTitle className="text-lg">{t[lang].title}</CardTitle>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="failRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                angle={-30}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 'dataMax + 10']}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg animate-scale-in">
                      <p className="font-medium text-foreground mb-2">{data.fullName}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-3 w-3 text-chart-1" />
                          <span>{t[lang].failRate}: <strong>{data.failRate}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">👥</span>
                          <span>{t[lang].participants}: <strong>{data.participants}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">💶</span>
                          <span>{t[lang].penalties}: <strong>{formatEUR(data.totalPenalties * 100)}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="failRate" 
                fill="url(#failRateGradient)"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity duration-200"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};