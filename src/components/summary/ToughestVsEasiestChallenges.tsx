import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/currency";
import { TrendingDown, TrendingUp, Award } from "lucide-react";

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

  const maxFailRate = useMemo(() => {
    return Math.max(...chartData.map(d => d.failRate), 0);
  }, [chartData]);

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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-chart-1" />
            <CardTitle className="text-lg">{t[lang].title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
              <Award className="h-3 w-3 mr-1" />
              Top {chartData.length}
            </Badge>
          </div>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
            <span className="text-xs text-muted-foreground">{t[lang].failRate}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            <span>Schwierigste → Leichteste</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
              barCategoryGap="20%"
            >
              <defs>
                {/* Orange to Red Gradient */}
                <linearGradient id="failRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.6} />
                </linearGradient>

                {/* Glow Filter */}
                <filter id="failRateGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--muted-foreground))" 
                strokeOpacity={0.2} 
              />
              
              <XAxis 
                dataKey="name" 
                tick={{ 
                  fontSize: 11, 
                  fill: 'hsl(var(--muted-foreground))',
                  fontWeight: 500
                }}
                angle={-30}
                textAnchor="end"
                height={80}
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              
              <YAxis 
                tick={{ 
                  fontSize: 11, 
                  fill: 'hsl(var(--muted-foreground))',
                  fontWeight: 500
                }}
                domain={[0, maxFailRate + Math.ceil(maxFailRate * 0.1)]}
                axisLine={false}
                tickLine={false}
                label={{ 
                  value: t[lang].failRate, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '11px', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background/95 backdrop-blur border rounded-xl p-4 shadow-xl animate-scale-in border-primary/20">
                      <p className="font-medium text-foreground mb-3 text-sm">{data.fullName}</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-3 w-3 text-orange-500" />
                            <span className="text-muted-foreground">{t[lang].failRate}</span>
                          </div>
                          <span className="font-semibold text-orange-600">{data.failRate}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">👥</span>
                            <span className="text-muted-foreground">{t[lang].participants}</span>
                          </div>
                          <span className="font-semibold">{data.participants}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">⚡</span>
                            <span className="text-muted-foreground">Verstöße</span>
                          </div>
                          <span className="font-semibold">{data.violations}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">💶</span>
                            <span className="text-muted-foreground">{t[lang].penalties}</span>
                          </div>
                          <span className="font-semibold">{formatEUR(data.totalPenalties * 100)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
                cursor={{ fill: 'transparent' }}
              />
              
              <Bar 
                dataKey="failRate" 
                fill="url(#failRateGradient)"
                radius={[6, 6, 0, 0]}
                className="transition-all duration-300 hover:brightness-110"
                onMouseEnter={(e) => {
                  if (e.target) {
                    e.target.style.filter = 'url(#failRateGlow)';
                    e.target.style.transform = 'scaleX(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (e.target) {
                    e.target.style.filter = 'none';
                    e.target.style.transform = 'scaleX(1)';
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};