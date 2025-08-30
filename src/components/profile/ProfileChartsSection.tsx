import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { format, eachMonthOfInterval } from "date-fns";
import { useMemo } from "react";

interface ProfileChartsSectionProps {
  challengesData: any;
  analyticsData: any;
  dateRange: { start: Date; end: Date };
  loading: boolean;
  t: any;
}

export function ProfileChartsSection({ 
  challengesData, 
  analyticsData, 
  dateRange, 
  loading, 
  t 
}: ProfileChartsSectionProps) {
  // Challenges & Violations Trend Chart Data
  const trendChartData = useMemo(() => {
    if (!challengesData || !analyticsData) return [];

    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      
      const challengesStarted = challengesData.filter((c: any) => 
        c.start_date.startsWith(monthStr)
      ).length;
      
      const violations = challengesData.reduce((total: number, c: any) => {
        return total + (c.challenge_violations || []).filter((v: any) => 
          v.date.startsWith(monthStr)
        ).length;
      }, 0);

      return {
        month: format(month, 'MMM yyyy'),
        challenges: challengesStarted,
        violations: violations
      };
    });
  }, [challengesData, analyticsData, dateRange]);

  // Violations per Participant Chart Data  
  const violationsPerParticipantData = useMemo(() => {
    if (!challengesData) return [];

    const participantViolations = new Map<string, number>();
    
    challengesData.forEach((challenge: any) => {
      (challenge.challenge_violations || []).forEach((violation: any) => {
        const current = participantViolations.get(violation.user_id) || 0;
        participantViolations.set(violation.user_id, current + 1);
      });
    });

    return Array.from(participantViolations.entries()).map(([userId, count]) => ({
      participant: userId.substring(0, 8) + '...',
      violations: count
    }));
  }, [challengesData]);

  // Cumulative Penalties Chart Data
  const cumulativePenaltiesData = useMemo(() => {
    if (!analyticsData) return [];
    
    let cumulative = 0;
    return analyticsData.weeklyData.map((week: any, index: number) => {
      cumulative += week.penalties;
      return {
        week: `W${index + 1}`,
        cumulative: Math.round(cumulative * 100) / 100
      };
    });
  }, [analyticsData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!challengesData || !analyticsData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.noData}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Challenges & Violations Trend */}
      <Card 
        id="challenges-section"
        className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg"
      >
        <CardHeader>
          <CardTitle>{t.challengesViolationsTrend}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              challenges: {
                label: "Challenges",
                color: "hsl(var(--primary))",
              },
              violations: {
                label: "Violations", 
                color: "hsl(var(--destructive))",
              },
            }}
            className="h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-sm text-muted-foreground"
                />
                <YAxis 
                  className="text-sm text-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="challenges" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="violations" 
                  stroke="hsl(var(--destructive))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--destructive))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violations per Participant */}
        <Card 
          id="fails-section"
          className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg"
        >
          <CardHeader>
            <CardTitle>{t.violationsPerParticipant}</CardTitle>
          </CardHeader>
          <CardContent>
            {violationsPerParticipantData.length > 0 ? (
              <ChartContainer
                config={{
                  violations: {
                    label: "Violations",
                    color: "hsl(var(--destructive))",
                  },
                }}
                className="h-64"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={violationsPerParticipantData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="participant"
                      className="text-sm text-muted-foreground"
                    />
                    <YAxis 
                      className="text-sm text-muted-foreground"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="violations" 
                      fill="hsl(var(--destructive))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {t.noData}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cumulative Penalties */}
        <Card 
          id="penalties-section"
          className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg"
        >
          <CardHeader>
            <CardTitle>{t.cumulativePenalties}</CardTitle>
          </CardHeader>
          <CardContent>
            {cumulativePenaltiesData.length > 0 ? (
              <ChartContainer
                config={{
                  cumulative: {
                    label: "Cumulative Penalties (€)",
                    color: "hsl(var(--destructive))",
                  },
                }}
                className="h-64"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativePenaltiesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="week"
                      className="text-sm text-muted-foreground"
                    />
                    <YAxis 
                      className="text-sm text-muted-foreground"
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value) => [`€${value}`, "Cumulative Penalties"]}
                    />
                    <Area 
                      type="monotone"
                      dataKey="cumulative"
                      stroke="hsl(var(--destructive))"
                      fill="hsl(var(--destructive) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {t.noData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}