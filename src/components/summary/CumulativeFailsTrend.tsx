import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDateRange } from "@/contexts/DateRangeContext";
import { isoWeekOf, startOfISOWeek, endOfISOWeek, weekRangeLabel, buildIsoWeeksInRange } from "@/lib/date";
import { generateParticipantColorMap } from "@/lib/participant-colors";
import { formatEUR } from "@/lib/currency";
import { useVisibleParticipants } from "@/hooks/useVisibleParticipants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendingUp, Eye, Target, Euro, EyeOff } from "lucide-react";
import { TimelineSlider } from "@/components/charts/TimelineSlider";
import ChartShell, { CHART_HEIGHT, CHART_MARGIN } from "@/components/summary/ChartShell";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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
  const [weekRange, setWeekRange] = useState<[number, number]>([0, 0]);
  const [mode, setMode] = useState<'fails' | 'penalties'>('fails');

  const t = {
    de: {
      title: "Kumulativer Trend",
      subtitle: "Gesammelte Werte pro Teilnehmer über die Zeit",
      titleFails: "Kumulativer Fails-Trend",
      titlePenalties: "Kumulativer Strafen-Trend",
      subtitleFails: "Gesammelte Verstöße pro Teilnehmer über die Zeit",
      subtitlePenalties: "Gesammelte Strafen (€) pro Teilnehmer über die Zeit",
      totalFails: "Gesamt Fails",
      totalPenalties: "Gesamt Strafen",
      noData: "Für den gewählten Zeitraum liegen keine kumulativen Werte vor. Passe den Wochenregler oder die Teilnehmer an.",
      participants: "Teilnehmer",
      filterByWeeks: "Nach Wochen filtern",
      toggleAll: "Alle",
      fails: "Fails",
      penalties: "€ Strafen"
    },
    en: {
      title: "Cumulative Trend",
      subtitle: "Accumulated values per participant over time",
      titleFails: "Cumulative Fails Trend",
      titlePenalties: "Cumulative Penalties Trend",
      subtitleFails: "Accumulated violations per participant over time",
      subtitlePenalties: "Accumulated penalties (€) per participant over time",
      totalFails: "Total Fails",
      totalPenalties: "Total Penalties",
      noData: "No cumulative data available for the selected period. Adjust the week slider or participants.",
      participants: "Participants",
      filterByWeeks: "Filter by weeks",
      toggleAll: "All",
      fails: "Fails",
      penalties: "€ Penalties"
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
        .select('user_id, created_at, challenge_id, amount_cents')
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

  // Use visibility hook for participant management
  const { visible: visibleParticipants, toggle: toggleParticipant, toggleAll, isVisible } = useVisibleParticipants(participants);

  // Generate weeks in range with stable indices using buildIsoWeeksInRange
  const weeks = useMemo(() => {
    if (!start || !end) return [];
    return buildIsoWeeksInRange(start, end).map((week, index) => ({
      weekIdx: index, // Use array index instead of ISO week number for consistent slider
      weekLabel: week.label,
      weekNumber: week.isoWeek,
      startDate: week.start,
      endDate: endOfISOWeek(week.start)
    }));
  }, [start, end]);

  // Initialize week range to match global date range context  
  useMemo(() => {
    if (weeks.length > 0) {
      const globalStartWeek = weeks.findIndex(week => 
        week.startDate.getTime() >= start.getTime()
      );
      const globalEndWeek = weeks.findIndex(week => 
        week.endDate.getTime() <= end.getTime()
      );
      
      // Use global range if valid, otherwise use full range
      if (globalStartWeek >= 0 && globalEndWeek >= 0 && globalStartWeek <= globalEndWeek) {
        setWeekRange([globalStartWeek, globalEndWeek]);
      } else {
        // Fallback to full range if no exact match
        setWeekRange([0, weeks.length - 1]);
      }
    }
  }, [weeks, start, end]);

  // Generate color map
  const colorMap = generateParticipantColorMap(participants);

  // Filter data by week range using array indices
  const [startIdx, endIdx] = weekRange;
  const filteredWeeks = weeks.slice(startIdx, endIdx + 1);

  // Generate chart data with normalized keys
  const chartData: TrendRow[] = useMemo(() => {
    if (!filteredWeeks.length || !participants.length) return [];

    return filteredWeeks.map(week => {
      const row: TrendRow = {
        weekIdx: week.weekIdx,
        weekLabel: week.weekLabel
      };

      // Calculate cumulative values for each participant up to this week
      participants.forEach(participant => {
        const userKey = `user_${participant.user_id}`;
        const participantViolations = violations.filter(v => 
          v.user_id === participant.user_id && 
          new Date(v.created_at) <= week.endDate
        );
        
        if (mode === 'fails') {
          row[userKey] = participantViolations.length;
        } else {
          // Calculate cumulative penalties in euros
          const cumulativePenalties = participantViolations.reduce((sum, v) => 
            sum + (v.amount_cents || 0) / 100, 0
          );
          row[userKey] = Math.round(cumulativePenalties * 100) / 100; // Round to 2 decimals
        }
      });

      return row;
    });
  }, [filteredWeeks, participants, violations, mode]);

  // Generate series info with stable keys - only for visible participants
  const series: SeriesInfo[] = useMemo(() => {
    return participants
      .filter(p => isVisible(p.user_id))
      .map(participant => ({
        key: `user_${participant.user_id}`,
        label: participant.display_name,
        color: colorMap[participant.user_id]
      }));
  }, [participants, isVisible, colorMap]);

  // Create label map for tooltips
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    participants.forEach(p => {
      map[`user_${p.user_id}`] = p.display_name;
    });
    return map;
  }, [participants]);

  // Calculate milestone thresholds
  const milestoneThresholds = useMemo(() => {
    if (!chartData.length || !series.length) return [];
    
    const maxValue = Math.max(...chartData.flatMap(row => 
      series.map(s => row[s.key] as number || 0)
    ));
    
    if (maxValue === 0) return [];
    
    return [
      { value: Math.max(1, Math.floor(maxValue * 0.3)), label: "Low Risk", color: '#10B981' },
      { value: Math.max(2, Math.floor(maxValue * 0.6)), label: "Moderate", color: '#F59E0B' },
      { value: Math.max(3, Math.floor(maxValue * 0.8)), label: "High Risk", color: '#EF4444' }
    ];
  }, [chartData, series]);

  // Calculate totals
  const totalFails = violations.length;
  const totalPenalties = violations.reduce((sum, v) => sum + (v.amount_cents || 0) / 100, 0);
  const totalPoints = series.reduce((acc, s) => 
    acc + chartData.filter(r => Number.isFinite(r[s.key])).length, 0
  );


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
            <div className="text-lg">
              {mode === 'fails' ? t[lang].titleFails : t[lang].titlePenalties}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {mode === 'fails' ? t[lang].subtitleFails : t[lang].subtitlePenalties}
            </div>
          </div>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <ToggleGroup 
            type="single" 
            value={mode} 
            onValueChange={(value) => value && setMode(value as 'fails' | 'penalties')}
            className="rounded-xl border border-border bg-background/50 p-1"
          >
            <ToggleGroupItem 
              value="fails" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=on]:bg-gradient-to-r data-[state=on]:from-emerald-500/10 data-[state=on]:to-emerald-600/10 data-[state=on]:text-emerald-700 data-[state=on]:shadow-sm transition-all duration-200 hover:bg-emerald-500/5"
            >
              <Target className="h-3 w-3" />
              {t[lang].fails}
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="penalties" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=on]:bg-gradient-to-r data-[state=on]:from-orange-500/10 data-[state=on]:to-orange-600/10 data-[state=on]:text-orange-700 data-[state=on]:shadow-sm transition-all duration-200 hover:bg-orange-500/5"
            >
              <Euro className="h-3 w-3" />
              {t[lang].penalties}
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Badge variant="secondary" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {mode === 'fails' 
              ? `${totalFails} ${t[lang].totalFails}` 
              : `${formatEUR(totalPenalties * 100)} ${t[lang].totalPenalties}`
            }
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="flex items-center gap-1 text-xs"
          >
            {visibleParticipants.size === participants.length ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
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
                const isSelected = isVisible(participant.user_id);
                const participantViolations = violations.filter(v => v.user_id === participant.user_id);
                const count = participantViolations.length;
                
                return (
                  <Button
                    key={participant.user_id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleParticipant(participant.user_id)}
                    className="flex items-center gap-2 text-xs border-2 transition-all duration-300 hover-scale"
                    style={{
                      borderColor: isSelected ? colorMap[participant.user_id] : 'hsl(var(--border))',
                      backgroundColor: isSelected ? `${colorMap[participant.user_id]}15` : 'transparent',
                      color: isSelected ? colorMap[participant.user_id] : 'hsl(var(--muted-foreground))',
                      opacity: isSelected ? 1 : 0.6
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full transition-all duration-300"
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
                weeks={weeks.map(w => w.startDate)}
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
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="weekLabel" 
              tickMargin={8}
              padding={{ left: 0, right: 0 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tickMargin={6}
              allowDecimals={mode === 'penalties'}
              domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
              width={40}
              label={{ 
                value: mode === 'fails' ? 'Fails' : '€', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              formatter={(value: any, key: string) => [
                mode === 'fails' 
                  ? `${value} Fails` 
                  : `€${Number(value).toFixed(2)}`,
                labelMap[key] ?? key
              ]}
              labelFormatter={(label: string) => label}
              filterNull
              contentStyle={{ 
                borderRadius: 12, 
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))'
              }}
            />
            
            {/* Milestone reference lines */}
            {milestoneThresholds.map((threshold, index) => (
              <ReferenceLine
                key={`milestone-${index}`}
                y={threshold.value}
                stroke={threshold.color}
                strokeDasharray="3 3"
                ifOverflow="extendDomain"
              />
            ))}
            
            {/* Participant lines - only render visible ones */}
            {series.map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                isAnimationActive
                connectNulls
                className="animate-fade-in"
              />
            ))}
          </LineChart>
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