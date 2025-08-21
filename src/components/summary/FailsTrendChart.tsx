import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek, isWithinInterval } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { generateParticipantColorMap } from "@/lib/participant-colors";

interface FailsTrendChartProps {
  lang: 'de' | 'en';
}

interface WeeklyData {
  week: string;
  weekNumber: number;
  [participantName: string]: number | string;
}

export const FailsTrendChart = ({ lang }: FailsTrendChartProps) => {
  const { start, end } = useDateRange();
  const locale = lang === 'de' ? de : enUS;

  const t = {
    de: {
      title: "Fails-Trend",
      description: "Wöchentliche Entwicklung von Verstößen pro Teilnehmer",
      week: "KW",
      fails: "Fails",
      noData: "Keine Daten für den gewählten Zeitraum"
    },
    en: {
      title: "Fails Trend",
      description: "Weekly development of violations per participant",
      week: "Week",
      fails: "Fails",
      noData: "No data for the selected period"
    }
  };

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['fails-trend', start, end],
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
          group_id
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

      const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Unknown']));

      // Get violations
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, created_at')
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
        const weekNumber = getWeek(week, { weekStartsOn: 1, firstWeekContainsDate: 4 });

        const weekData: WeeklyData = {
          week: `${t[lang].week} ${weekNumber}`,
          weekNumber
        };

        // Initialize all participants with 0 fails
        userIds.forEach(userId => {
          const name = profilesMap[userId];
          weekData[name] = 0;
        });

        // Count violations in this week
        (violations || []).forEach(violation => {
          const violationDate = new Date(violation.created_at);
          if (isWithinInterval(violationDate, { start: weekStart, end: weekEnd })) {
            const name = profilesMap[violation.user_id];
            if (name) {
              weekData[name] = (weekData[name] as number) + 1;
            }
          }
        });

        // Count KPI deviations in this week
        (kpiMeasurements || []).forEach(measurement => {
          const measurementDate = new Date(measurement.measurement_date);
          if (isWithinInterval(measurementDate, { start: weekStart, end: weekEnd })) {
            const name = profilesMap[measurement.user_id];
            if (name) {
              const kpiDef = measurement.kpi_definitions as any;
              const achievement = measurement.measured_value / kpiDef.target_value;
              
              let isDeviation = false;
              if (kpiDef.goal_direction === 'higher_better' && achievement < 1.0) {
                isDeviation = true;
              } else if (kpiDef.goal_direction === 'lower_better' && achievement > 1.0) {
                isDeviation = true;
              }

              if (isDeviation) {
                weekData[name] = (weekData[name] as number) + 1;
              }
            }
          }
        });

        return weekData;
      });

      // Generate color map for participants
      const participantData = (profiles || []).map(p => ({
        user_id: p.id,
        name: p.display_name || 'Unknown',
        custom_color: p.custom_color
      }));
      const colorMap = generateParticipantColorMap(participantData);

      return {
        data: weeklyData,
        participants: userIds.map(id => profilesMap[id]).filter(name => name !== 'Unknown'),
        colors: colorMap
      };
    },
    enabled: !!start && !!end
  });

  const chartConfig = useMemo(() => {
    if (!trendData) return {};
    
    const config: Record<string, { label: string; color: string }> = {};
    trendData.participants.forEach((participant, index) => {
      const userId = Object.keys(trendData.colors).find(id => 
        trendData.colors[id] === Object.values(trendData.colors)[index]
      );
      config[participant] = {
        label: participant,
        color: userId ? trendData.colors[userId] : `hsl(${index * 40}, 70%, 50%)`
      };
    });
    
    return config;
  }, [trendData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t[lang].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!trendData || trendData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t[lang].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
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
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[500px]">
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={trendData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="week"
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{ value: t[lang].fails, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '12px'
                }}
              />
               {trendData.participants.map((participant, index) => (
                 <Line
                   key={participant}
                   type="monotone"
                   dataKey={participant}
                   stroke={`hsl(var(--primary))`}
                   strokeWidth={3}
                   dot={{ fill: `hsl(var(--primary))`, strokeWidth: 2, r: 5 }}
                   activeDot={{ r: 7, strokeWidth: 2 }}
                   connectNulls={false}
                   style={{ 
                     filter: `hue-rotate(${(index * 60) % 360}deg)`,
                     opacity: 0.9 
                   }}
                 />
               ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};