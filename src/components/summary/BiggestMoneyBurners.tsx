import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatEUR } from "@/lib/currency";
import { DollarSign } from "lucide-react";

interface BiggestMoneyBurnersProps {
  data: Array<{
    challenges: Array<{
      id: string;
      title: string;
      challenge_type: 'habit' | 'kpi';
      totalViolationAmount: number;
      participants: Array<{ user_id: string; display_name: string }>;
      violationCount: number;
    }>;
  }>;
  lang: 'de' | 'en';
}

export const BiggestMoneyBurners = ({ data, lang }: BiggestMoneyBurnersProps) => {
  const t = {
    de: {
      title: "Größte Geldverbrenner",
      description: "Challenges mit den höchsten Strafzahlungen",
      totalPenalties: "Gesamtstrafen (€)",
      participants: "Teilnehmer",
      violations: "Verstöße",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Biggest Money Burners",
      description: "Challenges with the highest penalty amounts",
      totalPenalties: "Total Penalties (€)",
      participants: "Participants",
      violations: "Violations",
      noData: "No challenges for the selected period"
    }
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const challengeStats = new Map();

    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        const key = challenge.id;
        const totalPenalties = (challenge.totalViolationAmount || 0) / 100;
        
        if (totalPenalties > 0) {
          challengeStats.set(key, {
            name: challenge.title.length > 15 ? challenge.title.substring(0, 15) + '...' : challenge.title,
            fullName: challenge.title,
            type: challenge.challenge_type,
            totalPenalties,
            participants: challenge.participants?.length || 0,
            violations: challenge.violationCount || 0
          });
        }
      });
    });

    return Array.from(challengeStats.values())
      .sort((a, b) => b.totalPenalties - a.totalPenalties)
      .slice(0, 6); // Top 6 money burners
  }, [data]);

  const chartConfig = {
    totalPenalties: {
      label: t[lang].totalPenalties,
      color: "hsl(var(--chart-2))",
    },
  };

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-chart-2" />
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
          <DollarSign className="h-5 w-5 text-chart-2" />
          <CardTitle className="text-lg">{t[lang].title}</CardTitle>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
            >
              <defs>
                <linearGradient id="penaltyGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `€${value}`}
              />
              <YAxis 
                type="category"
                dataKey="name" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={70}
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
                          <span className="text-muted-foreground">💶</span>
                          <span>{t[lang].totalPenalties}: <strong>{formatEUR(data.totalPenalties * 100)}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">👥</span>
                          <span>{t[lang].participants}: <strong>{data.participants}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">⚠️</span>
                          <span>{t[lang].violations}: <strong>{data.violations}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="totalPenalties" 
                fill="url(#penaltyGradient)"
                radius={[0, 4, 4, 0]}
                className="hover:opacity-80 transition-opacity duration-200"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};