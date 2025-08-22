import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDateRange } from "@/contexts/DateRangeContext";
import { isoWeekOf, startOfISOWeek, endOfISOWeek, weekRangeLabel } from "@/lib/date";
import { generateParticipantColorMap } from "@/lib/participant-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye } from "lucide-react";
import { TimelineSlider } from "@/components/charts/TimelineSlider";
import ChartShell, { CHART_HEIGHT, CHART_MARGIN } from "@/components/summary/ChartShell";
import * as Recharts from "recharts";
import { ResponsiveContainer } from "recharts";

interface Participant {
  user_id: string;
  display_name: string;
  custom_color?: string;
}

interface Props {
  lang: 'de' | 'en';
}

interface TrendRow {
  weekIdx: number;
  weekLabel: string;
  [key: string]: number | string; // dynamic participant keys like "user_123"
}

interface SeriesInfo {
  key: string;
  label: string;
  color: string;
}

export function CumulativeFailsTrend({ lang }: Props) {
  const { start, end } = useDateRange();
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [weekRange, setWeekRange] = useState<[number, number]>([0, 0]);

  const t = {
    de: {
      title: "Kumulativer Fails-Trend",
      subtitle: "Gesammelte Verstöße pro Teilnehmer über die Zeit",
      totalFails: "Gesamt Fails",
      noData: "Für den gewählten Zeitraum liegen keine kumulativen Werte vor. Passe den Wochenregler oder die Teilnehmer an.",
      participants: "Teilnehmer",
      filterByWeeks: "Nach Wochen filtern",
      toggleAll: "Alle"
    },
    en: {
      title: "Cumulative Fails Trend",
      subtitle: "Accumulated violations per participant over time",
      totalFails: "Total Fails",
      noData: "No cumulative data available for the selected period. Adjust the week slider or participants.",
      participants: "Participants",
      filterByWeeks: "Filter by weeks",
      toggleAll: "All"
    }
  };

  // Fetch violations data
  const { data: queryData, isLoading } = useQuery({
    queryKey: ['cumulative-fails-trend', start, end],
    queryFn: async () => {
      if (!start || !end) return { violations: [], participants: [] };

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { violations: [], participants: [] };

      // Get user's groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.user.id);

      if (!userGroups?.length) return { violations: [], participants: [] };

      const groupIds = userGroups.map(g => g.group_id);

      // Get challenges from these groups
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id')
        .in('group_id', groupIds)
        .lte('start_date', end.toISOString().split('T')[0])
        .gte('end_date', start.toISOString().split('T')[0]);

      if (!challenges?.length) return { violations: [], participants: [] };

      const challengeIds = challenges.map(c => c.id);

      // Get violations in date range
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('user_id, created_at, challenge_id')
        .in('challenge_id', challengeIds)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at');

      // Get participants
      const { data: participantsRaw } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .in('challenge_id', challengeIds);

      const userIds = Array.from(new Set(participantsRaw?.map(p => p.user_id) || []));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, custom_color')
        .in('id', userIds);

      const participants: Participant[] = profiles?.map(p => ({
        user_id: p.id,
        display_name: p.display_name || 'Unknown',
        custom_color: p.custom_color || undefined
      })) || [];

      return {
        violations: violations || [],
        participants
      };
    },
    enabled: !!start && !!end
  });

  const { violations = [], participants = [] } = queryData || {};

  // Generate weeks in range
  const weeks = useMemo(() => {
    if (!start || !end) return [];
    const weeks = [];
    let current = startOfISOWeek(start);
    const endWeek = endOfISOWeek(end);
    
    while (current <= endWeek) {
      const weekNum = isoWeekOf(current);
      weeks.push({
        weekIdx: weekNum,
        weekLabel: weekRangeLabel(current, endOfISOWeek(current), lang),
        startDate: current,
        endDate: endOfISOWeek(current)
      });
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    return weeks;
  }, [start, end, lang]);

  // Initialize week range and selected participants
  useMemo(() => {
    if (weeks.length > 0 && weekRange[0] === 0 && weekRange[1] === 0) {
      setWeekRange([weeks[0].weekIdx, weeks[weeks.length - 1].weekIdx]);
    }
    if (participants.length > 0 && selectedParticipants.size === 0) {
      setSelectedParticipants(new Set(participants.map(p => p.user_id)));
    }
  }, [weeks, participants, weekRange, selectedParticipants.size]);

  // Generate color map
  const colorMap = generateParticipantColorMap(participants);

  // Filter data by week range (inclusive)
  const startWeek = weekRange[0];
  const endWeek = weekRange[1];
  const filteredWeeks = weeks.filter(w => w.weekIdx >= startWeek && w.weekIdx <= endWeek);

  // Generate chart data with normalized keys
  const chartData: TrendRow[] = useMemo(() => {
    if (!filteredWeeks.length || !participants.length) return [];

    return filteredWeeks.map(week => {
      const row: TrendRow = {
        weekIdx: week.weekIdx,
        weekLabel: week.weekLabel
      };

      // Calculate cumulative fails for each participant up to this week
      participants.forEach(participant => {
        const userKey = `user_${participant.user_id}`;
        const cumulativeFails = violations.filter(v => 
          v.user_id === participant.user_id && 
          new Date(v.created_at) <= week.endDate
        ).length;
        
        row[userKey] = cumulativeFails;
      });

      return row;
    });
  }, [filteredWeeks, participants, violations]);

  // Generate series info with stable keys
  const series: SeriesInfo[] = useMemo(() => {
    return participants
      .filter(p => selectedParticipants.has(p.user_id))
      .map(participant => ({
        key: `user_${participant.user_id}`,
        label: participant.display_name,
        color: colorMap[participant.user_id]
      }));
  }, [participants, selectedParticipants, colorMap]);

  // Calculate totals
  const totalFails = violations.length;
  const totalPoints = series.reduce((acc, s) => 
    acc + chartData.filter(r => Number.isFinite(r[s.key])).length, 0
  );

  // Toggle participant selection
  const toggleParticipant = (userId: string) => {
    const newSelection = new Set(selectedParticipants);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedParticipants(newSelection);
  };

  const toggleAllParticipants = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.user_id)));
    }
  };

  if (isLoading) {
    return (
      <ChartShell title={t[lang].title} subtitle={t[lang].subtitle}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title={
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <div>
            <div className="text-lg">{t[lang].title}</div>
            <div className="text-sm text-muted-foreground mt-1">{t[lang].subtitle}</div>
          </div>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {totalFails} {t[lang].totalFails}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllParticipants}
            className="flex items-center gap-1 text-xs"
          >
            <Eye className="h-3 w-3" />
            {t[lang].toggleAll}
          </Button>
        </div>
      }
      legend={
        <div className="space-y-3">
          {/* Participant Filters */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t[lang].participants}</h4>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => {
                const isSelected = selectedParticipants.has(participant.user_id);
                const participantViolations = violations.filter(v => v.user_id === participant.user_id);
                const count = participantViolations.length;
                
                return (
                  <Button
                    key={participant.user_id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleParticipant(participant.user_id)}
                    className="flex items-center gap-2 text-xs border-2 transition-all duration-200"
                    style={{
                      borderColor: isSelected ? colorMap[participant.user_id] : 'hsl(var(--border))',
                      backgroundColor: isSelected ? `${colorMap[participant.user_id]}15` : 'transparent',
                      color: isSelected ? colorMap[participant.user_id] : 'hsl(var(--muted-foreground))'
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: colorMap[participant.user_id],
                        opacity: isSelected ? 1 : 0.3
                      }}
                    />
                    {participant.display_name}
                    <Badge 
                      variant="outline" 
                      className="ml-1 text-xs border-0"
                      style={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent',
                        color: isSelected ? colorMap[participant.user_id] : 'hsl(var(--muted-foreground))'
                      }}
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Week Range Filter */}
          {weeks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{t[lang].filterByWeeks}</h4>
              <TimelineSlider
                weeks={weeks}
                selectedRange={weekRange}
                onRangeChange={setWeekRange}
                lang={lang}
              />
            </div>
          )}
        </div>
      }
    >
      {totalPoints > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <Recharts.LineChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <Recharts.CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <Recharts.XAxis 
              dataKey="weekLabel" 
              tickMargin={8}
              padding={{ left: 0, right: 0 }}
              className="text-xs text-muted-foreground"
            />
            <Recharts.YAxis 
              tickMargin={8}
              domain={[0, (dataMax: number) => Math.max(1, dataMax + 2)]}
              allowDecimals={false}
              className="text-xs text-muted-foreground"
              label={{ value: 'Fails', angle: -90, position: 'insideLeft' }}
            />
            <Recharts.Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-background/95 border rounded-lg shadow-lg p-3 backdrop-blur-sm">
                    <p className="font-medium text-sm mb-2">{label}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">{entry.dataKey}:</span>
                        <span className="font-medium">{entry.value} Fails</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {series.map(s => (
              <Recharts.Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive
                connectNulls
              />
            ))}
          </Recharts.LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p>{t[lang].noData}</p>
          </div>
        </div>
      )}
    </ChartShell>
  );
}