import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";

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

  const chartConfig = {
    violations: {
      label: t[lang].violations,
      color: "hsl(var(--destructive))",
    },
    kpiDeviations: {
      label: t[lang].kpiDeviations,
      color: "hsl(var(--primary))",
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
              />
              <Bar 
                dataKey="violations" 
                fill="var(--color-violations)"
                name={t[lang].violations}
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="kpiDeviations" 
                fill="var(--color-kpiDeviations)"
                name={t[lang].kpiDeviations}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};