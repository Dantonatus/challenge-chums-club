import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatEUR } from "@/lib/currency";
import { TrendingUp, Target } from "lucide-react";

interface BestROIChallengesProps {
  data: Array<{
    challenges: Array<{
      id: string;
      title: string;
      challenge_type: 'habit' | 'kpi';
      participants: Array<{ user_id: string; display_name: string }>;
      violationCount: number;
      totalViolationAmount: number;
    }>;
  }>;
  lang: 'de' | 'en';
}

export const BestROIChallenges = ({ data, lang }: BestROIChallengesProps) => {
  const t = {
    de: {
      title: "Beste ROI Challenges",
      description: "Fail-Rate vs. Strafauswirkung (Bubble-Größe = Teilnehmer)",
      failRate: "Fail-Rate (%)",
      penaltyImpact: "Strafauswirkung (€)",
      participants: "Teilnehmer",
      violations: "Verstöße",
      totalPenalties: "Gesamtstrafen",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Best ROI Challenges", 
      description: "Fail-Rate vs. Penalty Impact (Bubble size = Participants)",
      failRate: "Fail Rate (%)",
      penaltyImpact: "Penalty Impact (€)",
      participants: "Participants",
      violations: "Violations",
      totalPenalties: "Total Penalties",
      noData: "No challenges for the selected period"
    }
  };

  const bubbleData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const challengeStats: any[] = [];

    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        const participantCount = challenge.participants?.length || 0;
        const violationCount = challenge.violationCount || 0;
        const totalPenalties = (challenge.totalViolationAmount || 0) / 100;
        
        if (participantCount > 0) {
          const failRate = Math.round((violationCount / participantCount) * 100);
          const penaltyImpact = totalPenalties;
          
          challengeStats.push({
            id: challenge.id,
            name: challenge.title.length > 20 ? challenge.title.substring(0, 20) + '...' : challenge.title,
            fullName: challenge.title,
            x: failRate, // Fail rate as X axis
            y: penaltyImpact, // Penalty impact as Y axis
            z: participantCount, // Participant count as bubble size
            participants: participantCount,
            violations: violationCount,
            totalPenalties,
            type: challenge.challenge_type
          });
        }
      });
    });

    return challengeStats.sort((a, b) => b.z - a.z); // Sort by participant count
  }, [data]);

  const chartConfig = {
    scatter: {
      label: "Challenges",
      color: "hsl(var(--chart-5))",
    },
  };

  // Generate colors for different challenge types
  const getColor = (type: string, index: number) => {
    return type === 'habit' 
      ? `hsl(var(--chart-${(index % 5) + 1}))`
      : `hsl(var(--chart-${((index + 2) % 5) + 1}))`;
  };

  if (bubbleData.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-chart-5" />
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
    <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300 hover-scale lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-chart-5" />
          <CardTitle className="text-lg">{t[lang].title}</CardTitle>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
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
                tickFormatter={(value) => `€${value}`}
                label={{ 
                  value: t[lang].penaltyImpact, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg animate-scale-in">
                      <p className="font-medium text-foreground mb-2">{data.fullName}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-chart-1" />
                          <span>{t[lang].failRate}: <strong>{data.x}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">💶</span>
                          <span>{t[lang].penaltyImpact}: <strong>{formatEUR(data.y * 100)}</strong></span>
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
              <Scatter 
                data={bubbleData} 
                fill="hsl(var(--chart-5))"
                className="hover:opacity-80 transition-opacity duration-200"
              >
                {bubbleData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.type, index)}
                    opacity={0.7}
                    r={Math.max(4, Math.min(20, entry.z * 3))} // Scale bubble size based on participants
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};