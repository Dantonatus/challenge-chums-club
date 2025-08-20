import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatEUR } from "@/lib/currency";

interface ChallengeRankingProps {
  data: Array<{
    challenges: Array<{
      id: string;
      title: string;
      challenge_type: 'habit' | 'kpi';
      violations: Array<{ amount_cents: number }>;
      kpi_measurements?: Array<{ measured_value: number; target_value: number }>;
    }>;
  }>;
  lang: 'de' | 'en';
}

export const ChallengeRanking = ({ data, lang }: ChallengeRankingProps) => {
  const t = {
    de: {
      title: "Challenge-Ranking",
      description: "Challenges mit den meisten Strafen und Abweichungen",
      penalties: "Strafen (€)",
      difficulty: "Schwierigkeit (%)",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Challenge Ranking",
      description: "Challenges with the most penalties and deviations",
      penalties: "Penalties (€)",
      difficulty: "Difficulty (%)",
      noData: "No challenges for the selected period"
    }
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const challengeStats = new Map();

    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        const key = challenge.id;
        const existing = challengeStats.get(key) || {
          name: challenge.title.length > 20 ? challenge.title.substring(0, 20) + '...' : challenge.title,
          fullName: challenge.title,
          type: challenge.challenge_type,
          totalPenalties: 0,
          difficulty: 0
        };

        // Calculate total penalties
        const penaltyAmount = challenge.violations?.reduce((sum, v) => sum + v.amount_cents, 0) || 0;
        existing.totalPenalties += penaltyAmount / 100; // Convert to euros

        // Calculate difficulty for KPI challenges
        if (challenge.challenge_type === 'kpi' && challenge.kpi_measurements && challenge.kpi_measurements.length > 0) {
          const achievements = challenge.kpi_measurements.map(m => 
            Math.min(1, m.measured_value / m.target_value)
          );
          const avgAchievement = achievements.reduce((sum, a) => sum + a, 0) / achievements.length;
          existing.difficulty = Math.round((1 - avgAchievement) * 100);
        } else if (challenge.challenge_type === 'habit') {
          // For habit challenges, difficulty is based on violation frequency
          const violationCount = challenge.violations?.length || 0;
          existing.difficulty = Math.min(100, violationCount * 10); // Scale violations to percentage
        }

        challengeStats.set(key, existing);
      });
    });

    return Array.from(challengeStats.values())
      .sort((a, b) => {
        const aTotal = (typeof a.totalPenalties === 'number' ? a.totalPenalties : 0) + (typeof a.difficulty === 'number' ? a.difficulty : 0);
        const bTotal = (typeof b.totalPenalties === 'number' ? b.totalPenalties : 0) + (typeof b.difficulty === 'number' ? b.difficulty : 0);
        return bTotal - aTotal;
      })
      .slice(0, 10); // Top 10
  }, [data]);

  const chartConfig = {
    totalPenalties: {
      label: t[lang].penalties,
      color: "hsl(var(--chart-3))",
    },
    difficulty: {
      label: t[lang].difficulty,
      color: "hsl(var(--chart-4))",
    },
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t[lang].title}</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>{t[lang].title}</CardTitle>
        <CardDescription>{t[lang].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value, name, props) => [
                  name === 'totalPenalties' ? formatEUR(Number(value) * 100) : `${Number(value)}%`,
                  name === 'totalPenalties' ? t[lang].penalties : t[lang].difficulty
                ]}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Bar 
                dataKey="totalPenalties" 
                fill="var(--color-totalPenalties)"
                name={t[lang].penalties}
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="difficulty" 
                fill="var(--color-difficulty)"
                name={t[lang].difficulty}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};