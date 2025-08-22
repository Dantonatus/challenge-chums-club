import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";

interface ParticipantRankingProps {
  data: Array<{
    challenges: Array<{
      id: string;
      title: string;
      challenge_type: 'habit' | 'kpi';
      participants: Array<{ user_id: string; display_name: string }>;
      violations: Array<{ user_id: string; amount_cents: number }>;
      kpi_measurements?: Array<{ user_id: string; measured_value: number; target_value: number }>;
    }>;
  }>;
  lang: 'de' | 'en';
}

export const ParticipantRanking = ({ data, lang }: ParticipantRankingProps) => {
  const t = {
    de: {
      title: "Teilnehmer-Ranking",
      description: "Verstöße und KPI-Abweichungen nach Teilnehmer",
      violations: "Verstöße",
      kpiDeviations: "KPI-Abweichungen",
      noData: "Keine Daten für den gewählten Zeitraum"
    },
    en: {
      title: "Participant Ranking",
      description: "Violations and KPI deviations by participant",
      violations: "Violations",
      kpiDeviations: "KPI Deviations",
      noData: "No data for the selected period"
    }
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const participantStats = new Map();

    // Aggregate data from all challenges
    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        // Process violations for habit challenges
        if (challenge.challenge_type === 'habit') {
          challenge.violations?.forEach(violation => {
            const participant = challenge.participants.find(p => p.user_id === violation.user_id);
            if (participant) {
              const key = participant.user_id;
              const existing = participantStats.get(key) || {
                name: participant.display_name,
                violations: 0,
                kpiDeviations: 0
              };
              existing.violations += 1;
              participantStats.set(key, existing);
            }
          });
        }

        // Process KPI measurements - count as single fail per deviation
        if (challenge.challenge_type === 'kpi' && challenge.kpi_measurements) {
          challenge.kpi_measurements.forEach(measurement => {
            const participant = challenge.participants.find(p => p.user_id === measurement.user_id);
            if (participant) {
              const key = participant.user_id;
              const existing = participantStats.get(key) || {
                name: participant.display_name,
                violations: 0,
                kpiDeviations: 0
              };
              
              // Count as single deviation if target not met
              const achievement = measurement.measured_value / measurement.target_value;
              if (achievement < 1.0) {
                existing.kpiDeviations += 1;
              }
              participantStats.set(key, existing);
            }
          });
        }
      });
    });

    return Array.from(participantStats.values())
      .sort((a, b) => (b.violations + b.kpiDeviations) - (a.violations + a.kpiDeviations))
      .slice(0, 10); // Top 10
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map(d => d.violations + d.kpiDeviations), 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-chart-2" />
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
            <Users className="h-5 w-5 text-chart-2" />
            <CardTitle className="text-lg">{t[lang].title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-500/10 to-teal-500/10 border-blue-500/20">
              <TrendingUp className="h-3 w-3 mr-1" />
              Top {chartData.length}
            </Badge>
          </div>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-teal-500" />
            <span className="text-xs text-muted-foreground">{t[lang].violations}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
            <span className="text-xs text-muted-foreground">{t[lang].kpiDeviations}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
              barCategoryGap="25%"
            >
              <defs>
                {/* Blue to Teal Gradient */}
                <linearGradient id="violationsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
                </linearGradient>
                
                {/* Violet to Pink Gradient */}
                <linearGradient id="kpiDeviationsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity={0.6} />
                </linearGradient>

                {/* Glow Filters */}
                <filter id="violationsGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                <filter id="kpiGlow">
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
                domain={[0, maxValue + Math.ceil(maxValue * 0.1)]}
                axisLine={false}
                tickLine={false}
              />
              
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  const total = data.violations + data.kpiDeviations;
                  
                  return (
                    <div className="bg-background/95 backdrop-blur border rounded-xl p-4 shadow-xl animate-scale-in border-primary/20">
                      <p className="font-medium text-foreground mb-3 text-sm">{label}</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-teal-500" />
                            <span className="text-muted-foreground">{t[lang].violations}</span>
                          </div>
                          <span className="font-semibold">{data.violations}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
                            <span className="text-muted-foreground">{t[lang].kpiDeviations}</span>
                          </div>
                          <span className="font-semibold">{data.kpiDeviations}</span>
                        </div>
                        <div className="border-t pt-2 flex items-center justify-between gap-4">
                          <span className="text-muted-foreground font-medium">Total</span>
                          <span className="font-bold text-foreground">{total}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
                cursor={{ fill: 'transparent' }}
              />
              
              <Bar 
                dataKey="violations" 
                fill="url(#violationsGradient)"
                name={t[lang].violations}
                radius={[6, 6, 0, 0]}
                className="transition-all duration-300 hover:brightness-110"
                onMouseEnter={(e) => {
                  if (e.target) {
                    e.target.style.filter = 'url(#violationsGlow)';
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
              
              <Bar 
                dataKey="kpiDeviations" 
                fill="url(#kpiDeviationsGradient)"
                name={t[lang].kpiDeviations}
                radius={[6, 6, 0, 0]}
                className="transition-all duration-300 hover:brightness-110"
                onMouseEnter={(e) => {
                  if (e.target) {
                    e.target.style.filter = 'url(#kpiGlow)';
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