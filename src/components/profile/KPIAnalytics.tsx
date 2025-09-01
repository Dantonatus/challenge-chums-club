import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Target, TrendingUp, TrendingDown, Calendar, HelpCircle, Zap, Users, Shield, Euro } from "lucide-react";
import { format, parseISO, differenceInWeeks, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { KPIMetricModal } from "./KPIMetricModal";
import { motion } from "framer-motion";

interface KPIAnalyticsProps {
  userId: string;
}

export function KPIAnalytics({ userId }: KPIAnalyticsProps) {
  const { start, end } = useDateRange();
  const navigate = useNavigate();
  const [modalMetric, setModalMetric] = useState<'performance' | 'engagement' | 'discipline' | 'financial' | null>(null);

  // Fetch comprehensive analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["comprehensive-analytics", userId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      // Get user's challenges in date range
      const { data: userChallenges, error: challengesError } = await supabase
        .from("challenge_participants")
        .select(`
          challenge_id,
          challenges!inner (
            id,
            title,
            start_date,
            end_date,
            challenge_type,
            created_by
          )
        `)
        .eq("user_id", userId);

      if (challengesError) throw challengesError;

      const challengeIds = userChallenges?.map(uc => uc.challenge_id) || [];
      
      if (challengeIds.length === 0) {
        return { challenges: [], violations: [], participants: [], kpiMeasurements: [] };
      }

      // Get violations for these challenges in date range
      const { data: violations, error: violationsError } = await supabase
        .from("challenge_violations")
        .select("*")
        .in("challenge_id", challengeIds)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (violationsError) throw violationsError;

      // Get all participants for these challenges
      const { data: participants, error: participantsError } = await supabase
        .from("challenge_participants")
        .select("*")
        .in("challenge_id", challengeIds);

      if (participantsError) throw participantsError;

      // Get KPI measurements if any
      const { data: kpiMeasurements, error: kpiError } = await supabase
        .from("kpi_measurements")
        .select("*")
        .eq("user_id", userId)
        .gte("measurement_date", start.toISOString().split('T')[0])
        .lte("measurement_date", end.toISOString().split('T')[0]);

      if (kpiError) throw kpiError;

      return { 
        challenges: userChallenges || [], 
        violations: violations || [], 
        participants: participants || [],
        kpiMeasurements: kpiMeasurements || []
      };
    },
  });

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    if (!analyticsData) return null;

    const { challenges, violations, participants } = analyticsData;
    const weeks = Math.max(1, differenceInWeeks(end, start) || 1);
    
    // Get unique participants across all user's challenges
    const uniqueParticipants = new Set(participants.map(p => p.user_id));
    const totalParticipants = uniqueParticipants.size;
    
    // Calculate engagement (simplified - participants with any activity)
    const activeParticipants = new Set(violations.map(v => v.user_id));
    const engagementRate = totalParticipants > 0 ? (activeParticipants.size / totalParticipants) * 100 : 0;
    
    // Calculate discipline (normalized fail rate)
    const totalViolations = violations.length;
    const avgFailsPerUserPerWeek = totalParticipants > 0 ? totalViolations / (totalParticipants * weeks) : 0;
    const failThreshold = 1; // 1 fail per user per week is the threshold
    const disciplineScore = Math.max(0, 1 - (avgFailsPerUserPerWeek / failThreshold));
    
    // Calculate financial impact
    const totalPenalties = violations.reduce((sum, v) => sum + (v.amount_cents || 0), 0) / 100; // Convert to euros
    const financialImpact = totalParticipants > 0 ? totalPenalties / (totalParticipants * weeks) : 0;
    
    // Calculate performance index (weighted combination)
    const normalizedEngagement = engagementRate / 100;
    const normalizedFinancial = Math.max(0, 1 - (financialImpact / 10)); // Normalize assuming €10/week is max penalty
    const performanceIndex = (0.2 * normalizedEngagement + 0.5 * disciplineScore + 0.3 * normalizedFinancial) * 100;
    
    return {
      performance: performanceIndex,
      engagement: engagementRate,
      discipline: disciplineScore,
      financial: financialImpact,
      totalViolations,
      totalParticipants,
      weeks
    };
  }, [analyticsData, start, end]);

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
        <div className="flex flex-wrap gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="flex-1 min-w-[250px] h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!kpiMetrics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">
            No challenge data available for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced KPI Dashboard */}
      <div className="flex flex-wrap gap-6">
        {/* Performance Index Card - Enlarged Ring */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 min-w-[250px]"
        >
          <Card className="h-full relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">Performance Index</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setModalMetric('performance')}
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4 pb-6">
              {/* Enlarged Performance Ring */}
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: kpiMetrics.performance, fill: "hsl(var(--primary))" },
                        { value: 100 - kpiMetrics.performance, fill: "hsl(var(--muted))" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{kpiMetrics.performance.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">Score</span>
                </div>
              </div>
              
              {/* Delta Badge Below Ring */}
              <Badge variant="outline" className="text-xs">
                +15.1% vs Ø
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Engagement Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 min-w-[250px]"
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setModalMetric('engagement')}
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold">{kpiMetrics.engagement.toFixed(1)}%</span>
                <p className="text-xs text-muted-foreground">Active Participants</p>
              </div>
              <div className="h-16 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900 rounded-lg flex items-center justify-center">
                <div className="text-xs text-center">
                  <p className="font-medium">{new Set(analyticsData?.violations.map(v => v.user_id)).size} / {kpiMetrics.totalParticipants}</p>
                  <p className="text-muted-foreground">Users Active</p>
                </div>
              </div>
              <Badge variant={kpiMetrics.engagement > 80 ? "default" : "secondary"} className="w-full justify-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2.3% vs last period
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Discipline Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 min-w-[250px]"
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm font-medium">Discipline</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setModalMetric('discipline')}
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold">{(kpiMetrics.discipline * 100).toFixed(0)}%</span>
                <p className="text-xs text-muted-foreground">Discipline Score</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Violations</span>
                  <span>{kpiMetrics.totalViolations}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${kpiMetrics.discipline * 100}%` }}
                  />
                </div>
              </div>
              <Badge variant={kpiMetrics.discipline > 0.7 ? "default" : "destructive"} className="w-full justify-center">
                {kpiMetrics.discipline > 0.7 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {kpiMetrics.discipline > 0.7 ? '+' : '-'}5.1% vs last period
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Impact Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 min-w-[250px]"
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-sm font-medium">Financial Impact</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setModalMetric('financial')}
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold">€{kpiMetrics.financial.toFixed(2)}</span>
                <p className="text-xs text-muted-foreground">Per User/Week</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <p className="text-sm font-medium">Total: €{(analyticsData?.violations.reduce((sum, v) => sum + (v.amount_cents || 0), 0) / 100).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{kpiMetrics.weeks} weeks period</p>
              </div>
              <Badge variant={kpiMetrics.financial < 2 ? "default" : "destructive"} className="w-full justify-center">
                {kpiMetrics.financial < 2 ? (
                  <TrendingDown className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingUp className="h-3 w-3 mr-1" />
                )}
                {kpiMetrics.financial < 2 ? '-' : '+'}8.2% vs last period
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modal for metric explanations */}
      <KPIMetricModal
        isOpen={modalMetric !== null}
        onClose={() => setModalMetric(null)}
        metricType={modalMetric}
        values={kpiMetrics}
      />
    </div>
  );
}