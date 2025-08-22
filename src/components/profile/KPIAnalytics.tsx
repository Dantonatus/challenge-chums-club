import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Target, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface KPIAnalyticsProps {
  userId: string;
}

export function KPIAnalytics({ userId }: KPIAnalyticsProps) {
  const { start, end } = useDateRange();
  const navigate = useNavigate();

  // Fetch KPI challenges and measurements
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ["kpi-analytics", userId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      // Get KPI challenges for user in date range
      const { data: challenges, error: challengesError } = await supabase
        .from("challenges")
        .select(`
          id,
          title,
          start_date,
          end_date,
          kpi_definitions (
            id,
            kpi_type,
            target_value,
            unit,
            measurement_frequency,
            aggregation_method
          )
        `)
        .eq("challenge_type", "kpi")
        .eq("created_by", userId)
        .gte("start_date", start.toISOString().split('T')[0])
        .lte("start_date", end.toISOString().split('T')[0]);

      if (challengesError) throw challengesError;

      // Get measurements for these challenges
      const kpiDefinitionIds = challenges?.flatMap(c => 
        c.kpi_definitions?.map(kd => kd.id) || []
      ) || [];

      if (kpiDefinitionIds.length === 0) {
        return { challenges: [], measurements: [] };
      }

      const { data: measurements, error: measurementsError } = await supabase
        .from("kpi_measurements")
        .select("*")
        .in("kpi_definition_id", kpiDefinitionIds)
        .eq("user_id", userId)
        .gte("measurement_date", start.toISOString().split('T')[0])
        .lte("measurement_date", end.toISOString().split('T')[0])
        .order("measurement_date", { ascending: true });

      if (measurementsError) throw measurementsError;

      return { challenges: challenges || [], measurements: measurements || [] };
    },
  });

  const getKPIIcon = (kpiType: string) => {
    switch (kpiType) {
      case "steps": return "🚶";
      case "sleep_hours": return "😴";
      case "hrv": return "❤️";
      case "resting_hr": return "💓";
      default: return "📊";
    }
  };

  const getKPILabel = (kpiType: string) => {
    switch (kpiType) {
      case "steps": return "Schritte";
      case "sleep_hours": return "Schlafstunden";
      case "hrv": return "HRV";
      case "resting_hr": return "Ruhepuls";
      default: return "Messwert";
    }
  };

  const calculateKPIStats = (kpiDef: any, measurements: any[]) => {
    const relevantMeasurements = measurements.filter(m => m.kpi_definition_id === kpiDef.id);
    
    if (relevantMeasurements.length === 0) {
      return {
        current: 0,
        target: kpiDef.target_value,
        achievement: 0,
        trend: 0,
        dataPoints: []
      };
    }

    const values = relevantMeasurements.map(m => m.measured_value);
    let current = 0;
    
    switch (kpiDef.aggregation_method) {
      case "average":
        current = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "sum":
        current = values.reduce((a, b) => a + b, 0);
        break;
      case "max":
        current = Math.max(...values);
        break;
      case "min":
        current = Math.min(...values);
        break;
    }

    const achievement = (current / kpiDef.target_value) * 100;
    
    // Calculate trend (last vs first value)
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const trend = values.length > 1 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    const dataPoints = relevantMeasurements.map(m => ({
      date: format(parseISO(m.measurement_date), "dd.MM", { locale: de }),
      value: m.measured_value,
      target: kpiDef.target_value
    }));

    return { current, target: kpiDef.target_value, achievement, trend, dataPoints };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!kpiData?.challenges.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Keine KPI Challenges</h3>
          <p className="text-muted-foreground">
            Du hast noch keine KPI Challenges im ausgewählten Zeitraum.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiData.challenges.map((challenge) => 
          challenge.kpi_definitions?.map((kpiDef) => {
            const stats = calculateKPIStats(kpiDef, kpiData.measurements);
            
            return (
              <Card 
                key={kpiDef.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/app/challenges/${challenge.id}?tab=monitoring`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getKPIIcon(kpiDef.kpi_type)}</span>
                      <CardTitle className="text-sm font-medium">
                        {getKPILabel(kpiDef.kpi_type)}
                      </CardTitle>
                    </div>
                    <Badge variant={stats.achievement >= 100 ? "default" : "secondary"}>
                      {Math.round(stats.achievement)}%
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {challenge.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {kpiDef.aggregation_method === "average" ? stats.current.toFixed(1) : Math.round(stats.current)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {kpiDef.target_value} {kpiDef.unit}
                    </span>
                  </div>
                  
                  {stats.trend !== 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      {stats.trend > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={stats.trend > 0 ? "text-green-500" : "text-red-500"}>
                        {Math.abs(stats.trend).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">Trend</span>
                    </div>
                  )}

                  {/* Mini Chart */}
                  {stats.dataPoints.length > 1 && (
                    <div className="h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.dataPoints}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="target"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detailed Charts */}
      {kpiData.challenges.map((challenge) => 
        challenge.kpi_definitions?.map((kpiDef) => {
          const stats = calculateKPIStats(kpiDef, kpiData.measurements);
          
          if (stats.dataPoints.length <= 1) return null;

          return (
            <Card key={`chart-${kpiDef.id}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getKPIIcon(kpiDef.kpi_type)}</span>
                  <div>
                    <CardTitle>{getKPILabel(kpiDef.kpi_type)} Verlauf</CardTitle>
                    <CardDescription>{challenge.title}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  value: { label: getKPILabel(kpiDef.kpi_type), color: "hsl(var(--primary))" },
                  target: { label: "Ziel", color: "hsl(var(--muted-foreground))" }
                }}>
                  <LineChart data={stats.dataPoints}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}