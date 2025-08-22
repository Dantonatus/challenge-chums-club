import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek, isWithinInterval } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { TimelineSlider } from "./TimelineSlider";
import { InteractiveLegend } from "./InteractiveLegend";
import { EnhancedTooltip } from "./EnhancedTooltip";
import { TrendingUp, Calendar, Target, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PremiumFailsTrendChartProps {
  lang: 'de' | 'en';
}

interface WeeklyData {
  week: string;
  weekNumber: number;
  [participantName: string]: number | string;
}

interface ParticipantInfo {
  userId: string;
  name: string;
  color: string;
  totalFails: number;
  totalPenalties: number;
}

// Premium pastel color palette
const PASTEL_COLORS = [
  'hsl(var(--chart-pastel-1))',
  'hsl(var(--chart-pastel-2))',
  'hsl(var(--chart-pastel-3))',
  'hsl(var(--chart-pastel-4))',
  'hsl(var(--chart-pastel-5))',
  'hsl(var(--chart-pastel-6))',
  'hsl(var(--chart-pastel-7))',
  'hsl(var(--chart-pastel-8))',
  'hsl(var(--chart-pastel-9))',
  'hsl(var(--chart-pastel-10))',
];

export const PremiumFailsTrendChart = ({ lang }: PremiumFailsTrendChartProps) => {
  const { start, end } = useDateRange();
  const locale = lang === 'de' ? de : enUS;
  
  // State for interactive features
  const [visibleParticipants, setVisibleParticipants] = useState<Set<string>>(new Set());
  const [timelineRange, setTimelineRange] = useState<[number, number]>([0, 0]);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  const t = {
    de: {
      title: "Fails-Trend Premium",
      description: "Interaktive Analyse der wöchentlichen Verstöße",
      week: "KW",
      fails: "Fails",
      noData: "Keine Daten für den gewählten Zeitraum",
      totalFails: "Gesamt Fails",
      totalPenalties: "Gesamt Strafen",
      milestones: "Meilensteine",
      filterByWeek: "Nach Wochen filtern",
      participants: "Teilnehmer",
      highRisk: "Hohes Risiko",
      moderate: "Moderat",
      lowRisk: "Niedriges Risiko"
    },
    en: {
      title: "Premium Fails Trend",
      description: "Interactive analysis of weekly violations",
      week: "Week",
      fails: "Fails",
      noData: "No data for the selected period",
      totalFails: "Total Fails",
      totalPenalties: "Total Penalties",
      milestones: "Milestones",
      filterByWeek: "Filter by weeks",
      participants: "Participants",
      highRisk: "High Risk",
      moderate: "Moderate",
      lowRisk: "Low Risk"
    }
  };

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['premium-fails-trend', start, end],
    queryFn: async () => {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Get user's groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (!userGroups || userGroups.length === 0) return null;

      const groupIds = userGroups.map(g => g.group_id);

      // Get challenges in date range
      const { data: challenges } = await supabase
        .from('challenges')
        .select(`
          id,
          title,
          challenge_type,
          start_date,
          end_date,
          group_id,
          penalty_cents
        `)
        .in('group_id', groupIds)
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      if (!challenges || challenges.length === 0) return null;

      const challengeIds = challenges.map(c => c.id);

      // Get all participants
      const { data: participantsRaw } = await supabase
        .from('challenge_participants')
        .select('challenge_id, user_id')
        .in('challenge_id', challengeIds);

      // Get profiles
      const userIds = Array.from(new Set((participantsRaw || []).map(p => p.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, custom_color')
        .in('id', userIds);

      const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      // Get violations with penalties
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, created_at, amount_cents')
        .in('challenge_id', challengeIds)
        .gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`);

      // Get KPI measurements
      const { data: kpiMeasurements } = await supabase
        .from('kpi_measurements')
        .select(`
          user_id,
          measured_value,
          measurement_date,
          kpi_definitions!inner(
            challenge_id,
            target_value,
            goal_direction
          )
        `)
        .gte('measurement_date', startStr)
        .lte('measurement_date', endStr);

      // Generate weeks in range
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      
      const weeklyData: WeeklyData[] = weeks.map(week => {
        const weekStart = startOfWeek(week, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
        const weekNumber = getWeek(week, { weekStartsOn: 1, firstWeekContainsDate: 4, locale: de });

        const weekData: WeeklyData = {
          week: `${t[lang].week} ${weekNumber}`,
          weekNumber
        };

        // Initialize all participants with 0 fails
        userIds.forEach(userId => {
          const profile = profilesMap[userId];
          if (profile?.display_name && profile.display_name !== 'Unknown') {
            weekData[profile.display_name] = 0;
          }
        });

        // Count violations in this week
        (violations || []).forEach(violation => {
          const violationDate = new Date(violation.created_at);
          if (isWithinInterval(violationDate, { start: weekStart, end: weekEnd })) {
            const profile = profilesMap[violation.user_id];
            if (profile?.display_name) {
              weekData[profile.display_name] = (weekData[profile.display_name] as number) + 1;
            }
          }
        });

        // Count KPI deviations in this week
        (kpiMeasurements || []).forEach(measurement => {
          const measurementDate = new Date(measurement.measurement_date);
          if (isWithinInterval(measurementDate, { start: weekStart, end: weekEnd })) {
            const profile = profilesMap[measurement.user_id];
            if (profile?.display_name) {
              const kpiDef = measurement.kpi_definitions as any;
              const achievement = measurement.measured_value / kpiDef.target_value;
              
              let isDeviation = false;
              if (kpiDef.goal_direction === 'higher_better' && achievement < 1.0) {
                isDeviation = true;
              } else if (kpiDef.goal_direction === 'lower_better' && achievement > 1.0) {
                isDeviation = true;
              }

              if (isDeviation) {
                weekData[profile.display_name] = (weekData[profile.display_name] as number) + 1;
              }
            }
          }
        });

        return weekData;
      });

      // Generate participant info with colors and stats
      const participants: ParticipantInfo[] = userIds
        .map((id, index) => {
          const profile = profilesMap[id];
          if (!profile?.display_name || profile.display_name === 'Unknown') return null;

          const totalFails = weeklyData.reduce((sum, week) => 
            sum + (week[profile.display_name] as number || 0), 0);
          
          const totalPenalties = (violations || [])
            .filter(v => v.user_id === id)
            .reduce((sum, v) => sum + (v.amount_cents || 0), 0);

          return {
            userId: id,
            name: profile.display_name,
            color: profile.custom_color || PASTEL_COLORS[index % PASTEL_COLORS.length],
            totalFails,
            totalPenalties
          };
        })
        .filter(Boolean) as ParticipantInfo[];

      return {
        data: weeklyData,
        participants,
        weeks,
        challenges: challenges || []
      };
    },
    enabled: !!start && !!end
  });

  // Initialize timeline range and visible participants
  useMemo(() => {
    if (trendData) {
      if (timelineRange[1] === 0) {
        setTimelineRange([0, trendData.weeks.length - 1]);
      }
      if (visibleParticipants.size === 0) {
        setVisibleParticipants(new Set(trendData.participants.map(p => p.name)));
      }
    }
  }, [trendData, timelineRange, visibleParticipants]);

  // Filter data based on timeline selection
  const filteredData = useMemo(() => {
    if (!trendData) return [];
    const [startIdx, endIdx] = timelineRange;
    return trendData.data.slice(startIdx, endIdx + 1);
  }, [trendData, timelineRange]);

  // Chart configuration
  const chartConfig = useMemo(() => {
    if (!trendData) return {};
    
    const config: Record<string, { label: string; color: string }> = {};
    trendData.participants.forEach((participant) => {
      config[participant.name] = {
        label: participant.name,
        color: participant.color
      };
    });
    
    return config;
  }, [trendData]);

  // Handle legend toggle
  const handleLegendToggle = useCallback((name: string, visible: boolean) => {
    const newVisible = new Set(visibleParticipants);
    if (visible) {
      newVisible.add(name);
    } else {
      newVisible.delete(name);
    }
    setVisibleParticipants(newVisible);
  }, [visibleParticipants]);

  // Calculate milestone thresholds
  const milestoneThresholds = useMemo(() => {
    if (!trendData) return [];
    const maxFails = Math.max(...trendData.data.flatMap(week => 
      trendData.participants.map(p => week[p.name] as number || 0)
    ));
    
    return [
      { value: Math.ceil(maxFails * 0.3), label: t[lang].lowRisk, color: 'hsl(var(--milestone-success))' },
      { value: Math.ceil(maxFails * 0.6), label: t[lang].moderate, color: 'hsl(var(--milestone-warning))' },
      { value: Math.ceil(maxFails * 0.8), label: t[lang].highRisk, color: 'hsl(var(--milestone-danger))' }
    ];
  }, [trendData, lang, t]);

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!trendData || trendData.data.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t[lang].title}
          </CardTitle>
          
          {/* Summary Stats */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Target className="w-3 h-3 mr-1" />
              {trendData.participants.reduce((sum, p) => sum + p.totalFails, 0)} {t[lang].totalFails}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              €{(trendData.participants.reduce((sum, p) => sum + p.totalPenalties, 0) / 100).toFixed(2)}
            </Badge>
          </div>
        </div>

        {/* Interactive Legend */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t[lang].participants}</h4>
          <InteractiveLegend
            items={trendData.participants.map(p => ({
              name: p.name,
              color: p.color,
              value: p.totalFails
            }))}
            onToggle={handleLegendToggle}
          />
        </div>

        {/* Timeline Slider */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t[lang].filterByWeek}</h4>
          <TimelineSlider
            weeks={trendData.weeks}
            selectedRange={timelineRange}
            onRangeChange={setTimelineRange}
            lang={lang}
          />
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[500px]">
          <ResponsiveContainer width="100%" height={500}>
            <LineChart 
              data={filteredData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--chart-grid))" 
                opacity={0.3}
                horizontal={true}
                vertical={false}
              />
              
              <XAxis 
                dataKey="week"
                tick={{ fontSize: 12, fill: 'hsl(var(--chart-axis))' }}
                axisLine={{ stroke: 'hsl(var(--chart-axis))', strokeWidth: 1 }}
                tickLine={false}
                dy={10}
              />
              
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--chart-axis))' }}
                axisLine={{ stroke: 'hsl(var(--chart-axis))', strokeWidth: 1 }}
                tickLine={false}
                label={{ 
                  value: t[lang].fails, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--chart-axis))' }
                }}
              />


              <EnhancedTooltip lang={lang} />

              {/* Dynamic Lines */}
              {trendData.participants.map((participant) => {
                const isVisible = visibleParticipants.has(participant.name);
                const isHovered = hoveredLine === participant.name;
                
                return (
                  <Line
                    key={participant.name}
                    type="linear"
                    dataKey={participant.name}
                    stroke={participant.color}
                    strokeWidth={isHovered ? 4 : 3}
                    dot={false}
                    activeDot={{ 
                      r: 6,
                      strokeWidth: 2,
                      fill: participant.color,
                      stroke: 'hsl(var(--background))',
                      style: {
                        filter: `drop-shadow(0 0 8px ${participant.color})`
                      }
                    }}
                    connectNulls={false}
                    opacity={isVisible ? (isHovered ? 1 : 0.8) : 0}
                    className={isHovered ? 'chart-line-glow' : ''}
                    onMouseEnter={() => setHoveredLine(participant.name)}
                    style={{
                      filter: isHovered ? `drop-shadow(0 0 8px ${participant.color})` : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

      </CardContent>
    </Card>
  );
};