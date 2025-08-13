import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, TrendingDown, Calendar, Edit } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { KPIEditDialog } from "./KPIEditDialog";

interface KPIDefinition {
  id: string;
  kpi_type: string;
  target_value: number;
  unit: string;
  measurement_frequency: string;
  aggregation_method: string;
  goal_direction: string;
}

interface KPIMeasurement {
  id: string;
  measured_value: number;
  measurement_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface KPIDetailChartProps {
  challengeId: string;
  kpiDefinition: KPIDefinition;
  userId: string;
}

export function KPIDetailChart({ challengeId, kpiDefinition, userId }: KPIDetailChartProps) {
  const [editingMeasurement, setEditingMeasurement] = useState<KPIMeasurement | null>(null);
  
  // Fetch KPI measurements
  const { data: measurements, isLoading, refetch } = useQuery({
    queryKey: ["kpi-measurements", kpiDefinition.id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_measurements")
        .select("*")
        .eq("kpi_definition_id", kpiDefinition.id)
        .eq("user_id", userId)
        .order("measurement_date", { ascending: true });
      
      if (error) throw error;
      return data || [];
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

  const formatDateForFrequency = (dateStr: string) => {
    const date = parseISO(dateStr);
    switch (kpiDefinition.measurement_frequency) {
      case "weekly":
        return `KW ${format(date, "w", { locale: de })}`;
      case "monthly":
        return format(date, "MMM yy", { locale: de });
      default:
        return format(date, "dd.MM", { locale: de });
    }
  };

  // Calculate current performance
  const currentStats = () => {
    if (!measurements?.length) {
      return {
        current: 0,
        achievement: 0,
        trend: 0,
        lastValue: 0,
        measurementCount: 0
      };
    }

    const values = measurements.map(m => m.measured_value);
    let current = 0;
    
    switch (kpiDefinition.aggregation_method) {
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

    const achievement = (current / kpiDefinition.target_value) * 100;
    
    // Calculate trend (last vs first value)
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const trend = values.length > 1 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
    // Calculate overall goal achievement based on goal direction
    const overallGoalAchieved = kpiDefinition.goal_direction === "higher_better" 
      ? current >= kpiDefinition.target_value
      : current <= kpiDefinition.target_value;

    return {
      current,
      achievement,
      trend,
      lastValue,
      measurementCount: values.length,
      overallGoalAchieved
    };
  };

  const stats = currentStats();

  // Prepare chart data
  const chartData = measurements?.map(m => ({
    date: formatDateForFrequency(m.measurement_date),
    value: m.measured_value,
    target: kpiDefinition.target_value,
    rawDate: m.measurement_date
  })) || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!measurements?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4">{getKPIIcon(kpiDefinition.kpi_type)}</div>
          <h3 className="text-lg font-semibold mb-2">Noch keine Daten</h3>
          <p className="text-muted-foreground mb-4">
            Trage deine ersten {getKPILabel(kpiDefinition.kpi_type)}-Werte ein, um den Verlauf zu sehen
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Ziel: {kpiDefinition.target_value} {kpiDefinition.unit}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktueller Wert</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {kpiDefinition.aggregation_method === "average" ? stats.current.toFixed(1) : Math.round(stats.current)}
                  </span>
                  <span className="text-sm text-muted-foreground">{kpiDefinition.unit}</span>
                </div>
              </div>
              <span className="text-2xl">{getKPIIcon(kpiDefinition.kpi_type)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zielerreichung</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{Math.round(stats.achievement)}%</span>
                  <Badge variant={stats.overallGoalAchieved ? "default" : "secondary"}>
                    {stats.overallGoalAchieved ? "Erreicht ✅" : "In Arbeit"}
                  </Badge>
                </div>
              </div>
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trend</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {stats.trend > 0 ? "+" : ""}{stats.trend.toFixed(1)}%
                  </span>
                  {stats.trend > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : stats.trend < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.measurementCount} Messungen
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{getKPIIcon(kpiDefinition.kpi_type)}</span>
            {getKPILabel(kpiDefinition.kpi_type)} Verlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={{
              value: { 
                label: getKPILabel(kpiDefinition.kpi_type), 
                color: "hsl(var(--primary))" 
              },
              target: { 
                label: "Ziel", 
                color: "hsl(var(--muted-foreground))" 
              }
            }}
            className="h-64"
          >
            <LineChart data={chartData}>
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
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(label, payload) => {
                  if (payload?.[0]?.payload?.rawDate) {
                    return format(parseISO(payload[0].payload.rawDate), 'PPP', { locale: de });
                  }
                  return label;
                }}
              />
              {/* Target line (dashed) */}
              <Line
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Ziel"
              />
              {/* Actual values line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ 
                  fill: "hsl(var(--primary))", 
                  strokeWidth: 2, 
                  r: 4 
                }}
                name={getKPILabel(kpiDefinition.kpi_type)}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Measurements List with Edit Functionality */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Messungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {measurements?.map((measurement: KPIMeasurement) => {
              const goalAchieved = kpiDefinition.goal_direction === "higher_better" 
                ? measurement.measured_value >= kpiDefinition.target_value
                : measurement.measured_value <= kpiDefinition.target_value;
              
              return (
                <div key={measurement.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(measurement.measurement_date), 'dd.MM.yyyy', { locale: de })}
                    </div>
                    <div className="font-medium">
                      {measurement.measured_value} {kpiDefinition.unit}
                    </div>
                    <Badge variant={goalAchieved ? "default" : "destructive"} className="text-xs">
                      {goalAchieved ? "✅" : "❌"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMeasurement(measurement)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingMeasurement && (
        <KPIEditDialog
          open={!!editingMeasurement}
          onOpenChange={(open) => !open && setEditingMeasurement(null)}
          measurement={editingMeasurement}
          kpiDefinition={kpiDefinition}
          onSuccess={() => {
            refetch();
            setEditingMeasurement(null);
          }}
        />
      )}
    </div>
  );
}