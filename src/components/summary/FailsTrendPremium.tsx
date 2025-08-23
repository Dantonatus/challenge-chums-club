import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, isWithinInterval } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { buildIsoWeeksInRange, startOfISOWeek, endOfISOWeek, isoWeekOf } from "@/lib/date";
import { TimelineSlider } from "@/components/charts/TimelineSlider";
import { InteractiveLegend } from "@/components/charts/InteractiveLegend";

import { TrendingUp, Calendar, Target, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompareBar } from "./CompareBar";
import ChartShell, { CHART_HEIGHT, CHART_MARGIN } from "./ChartShell";

interface FailsTrendPremiumProps {
  lang: 'de' | 'en';
  compareMode?: boolean;
  onCompareParticipants?: (participantA: string, participantB: string) => void;
}

interface WeeklyData {
  weekIdx: number;
  weekLabel: string;
  [userKey: string]: number | string; // user_<id> keys
}

interface ParticipantInfo {
  userId: string;
  name: string;
  color: string;
  totalFails: number;
  totalPenalties: number;
}

// Modern aqua-teal color palette - matching profile color scheme
const PASTEL_COLORS = [
  '#26C6DA', '#29B6F6', '#66BB6A', '#00BCD4', '#4FC3F7',
  '#4CAF50', '#0288D1', '#4DB6AC', '#1DE9B6', '#009688'
];

export const FailsTrendPremium = ({ lang, compareMode = false, onCompareParticipants }: FailsTrendPremiumProps) => {
  const { start, end } = useDateRange();
  const locale = lang === 'de' ? de : enUS;
  
  // State for interactive features
  const [visibleParticipants, setVisibleParticipants] = useState<Set<string>>(new Set());
  const [timelineRange, setTimelineRange] = useState<[number, number]>([0, 0]);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [showReferences, setShowReferences] = useState(true);
  const [compareParticipants, setCompareParticipants] = useState<[string | null, string | null]>([null, null]);

  const t = {
    de: {
      title: "Fails per Week",
      description: "Number of fails per participant per calendar week",
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
      lowRisk: "Niedriges Risiko",
      references: "Referenzlinien",
      compare: "Vergleichen",
      difference: "Differenz",
      maxDiff: "Max Δ"
    },
    en: {
      title: "Fails per Week",
      description: "Number of fails per participant per calendar week",
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
      lowRisk: "Low Risk",
      references: "Reference Lines",
      compare: "Compare",
      difference: "Difference",
      maxDiff: "Max Δ"
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

      // Generate weeks in range with stable indices using buildIsoWeeksInRange
      const isoWeeks = buildIsoWeeksInRange(start, end);
      
      const weeklyData: WeeklyData[] = isoWeeks.map((week, index) => {
        const weekStart = week.start;
        const weekEnd = endOfISOWeek(week.start);
        const weekNumber = week.isoWeek;

        const weekData: WeeklyData = {
          weekIdx: index, // Use array index for consistent slider behavior
          weekLabel: week.label
        };

        // Initialize all participants with 0 fails using stable user keys
        userIds.forEach(userId => {
          const userKey = `user_${userId}`;
          weekData[userKey] = 0;
        });

        // Count violations in this week
        (violations || []).forEach(violation => {
          const violationDate = new Date(violation.created_at);
          if (isWithinInterval(violationDate, { start: weekStart, end: weekEnd })) {
            const userKey = `user_${violation.user_id}`;
            weekData[userKey] = (weekData[userKey] as number) + 1;
          }
        });

        // Count KPI deviations in this week
        (kpiMeasurements || []).forEach(measurement => {
          const measurementDate = new Date(measurement.measurement_date);
          if (isWithinInterval(measurementDate, { start: weekStart, end: weekEnd })) {
            const userKey = `user_${measurement.user_id}`;
            const kpiDef = measurement.kpi_definitions as any;
            const achievement = measurement.measured_value / kpiDef.target_value;
            
            let isDeviation = false;
            if (kpiDef.goal_direction === 'higher_better' && achievement < 1.0) {
              isDeviation = true;
            } else if (kpiDef.goal_direction === 'lower_better' && achievement > 1.0) {
              isDeviation = true;
            }

            if (isDeviation) {
              weekData[userKey] = (weekData[userKey] as number) + 1;
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

          const userKey = `user_${id}`;
          const totalFails = weeklyData.reduce((sum, week) => 
            sum + (week[userKey] as number || 0), 0);
          
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
        weeks: isoWeeks.map((week, idx) => ({
          weekIdx: idx, // Use array index for consistency
          weekLabel: week.label,
          startDate: week.start,
          endDate: endOfISOWeek(week.start)
        })),
        challenges: challenges || []
      };
    },
    enabled: !!start && !!end
  });

  // Initialize timeline range and visible participants
  useMemo(() => {
    if (trendData && trendData.weeks.length > 0) {
      setTimelineRange([0, trendData.weeks.length - 1]);
      
      if (visibleParticipants.size === 0) {
        setVisibleParticipants(new Set(trendData.participants.map(p => p.userId)));
      }
    }
  }, [trendData?.weeks.length]);

  // Filter data based on timeline selection
  const filteredData = useMemo(() => {
    if (!trendData) return [];
    const [startIdx, endIdx] = timelineRange;
    let data = trendData.data.slice(startIdx, endIdx + 1);
    
    // Add difference line if comparing
    if (compareMode && compareParticipants[0] && compareParticipants[1]) {
      data = data.map(week => ({
        ...week,
        [`${t[lang].difference} (${compareParticipants[0]} - ${compareParticipants[1]})`]: 
          (week[compareParticipants[0]] as number || 0) - (week[compareParticipants[1]] as number || 0)
      }));
    }
    
    return data;
  }, [trendData, timelineRange, compareMode, compareParticipants, lang, t]);

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
    
    // Add difference line config
    if (compareMode && compareParticipants[0] && compareParticipants[1]) {
      config[`${t[lang].difference} (${compareParticipants[0]} - ${compareParticipants[1]})`] = {
        label: `${t[lang].difference}`,
        color: '#6B7280' // neutral gray
      };
    }
    
    return config;
  }, [trendData, compareMode, compareParticipants, lang, t]);

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

  // Handle compare participants selection
  const handleCompareSelection = useCallback((participantA: string, participantB: string) => {
    setCompareParticipants([participantA, participantB]);
    onCompareParticipants?.(participantA, participantB);
  }, [onCompareParticipants]);

  // Calculate comparison annotation
  const comparisonAnnotation = useMemo(() => {
    if (!compareMode || !compareParticipants[0] || !compareParticipants[1] || !filteredData.length) {
      return null;
    }
    
    const diffKey = `${t[lang].difference} (${compareParticipants[0]} - ${compareParticipants[1]})`;
    const maxDiff = Math.max(...filteredData.map(week => Math.abs(week[diffKey] as number || 0)));
    const maxDiffWeek = filteredData.find(week => Math.abs(week[diffKey] as number || 0) === maxDiff);
    
    return {
      maxDiff,
      week: maxDiffWeek?.week,
      value: maxDiffWeek?.[diffKey] as number || 0
    };
  }, [compareMode, compareParticipants, filteredData, lang, t]);

  // Calculate milestone thresholds
  const milestoneThresholds = useMemo(() => {
    if (!trendData) return [];
    const maxFails = Math.max(...trendData.data.flatMap(week => 
      trendData.participants.map(p => week[`user_${p.userId}`] as number || 0)
    ));
    
    if (maxFails === 0) return [];
    
    return [
      { value: Math.max(1, Math.floor(maxFails * 0.3)), label: t[lang].lowRisk, color: '#10B981' },
      { value: Math.max(2, Math.floor(maxFails * 0.6)), label: t[lang].moderate, color: '#F59E0B' },
      { value: Math.max(3, Math.floor(maxFails * 0.8)), label: t[lang].highRisk, color: '#EF4444' }
    ];
  }, [trendData, lang, t]);

  // Create label map for tooltips
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    trendData?.participants.forEach(p => {
      map[`user_${p.userId}`] = p.name;
    });
    return map;
  }, [trendData?.participants]);

  if (isLoading) {
    return (
      <ChartShell
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t[lang].title}
          </div>
        }
      >
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl" />
      </ChartShell>
    );
  }

  if (!trendData || trendData.data.length === 0) {
    return (
      <ChartShell
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t[lang].title}
          </div>
        }
      >
        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {t[lang].noData}
          </div>
        </div>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title={
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t[lang].title}
        </div>
      }
      headerRight={
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <Target className="w-3 h-3 mr-1" />
            {trendData.participants.reduce((sum, p) => sum + p.totalFails, 0)} {t[lang].totalFails}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            €{(trendData.participants.reduce((sum, p) => sum + p.totalPenalties, 0) / 100).toFixed(2)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReferences(!showReferences)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showReferences ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="ml-2 text-xs">{t[lang].references}</span>
          </Button>
        </div>
      }
      legend={
        <div className="space-y-4">
          {/* Compare Mode Controls */}
          {compareMode && (
            <CompareBar
              participants={trendData.participants.map(p => p.name)}
              onSelectionChange={handleCompareSelection}
              lang={lang}
            />
          )}

          {/* Comparison Annotation */}
          {comparisonAnnotation && (
            <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-muted-foreground">
                <strong>{compareParticipants[0]} vs {compareParticipants[1]}</strong>, {t[lang].maxDiff} at {comparisonAnnotation.week}: 
                <span className={`ml-1 font-semibold ${comparisonAnnotation.value > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {comparisonAnnotation.value > 0 ? '+' : ''}{comparisonAnnotation.value}
                </span>
              </p>
            </div>
          )}

          {/* Interactive Legend */}
          <div className="flex-1">
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
              weeks={trendData.weeks.map(week => week.startDate)}
              selectedRange={timelineRange}
              onRangeChange={setTimelineRange}
              lang={lang}
            />
          </div>
        </div>
      }
      footer={
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{t[lang].milestones}</h4>
          <div className="flex flex-wrap gap-2">
            {milestoneThresholds.map((milestone, index) => (
              <Badge 
                key={index}
                variant="outline" 
                className="text-xs px-2 py-1" 
                style={{ 
                  borderColor: milestone.color,
                  color: milestone.color,
                  backgroundColor: `${milestone.color}15`
                }}
              >
                {milestone.label}: ≥{milestone.value}
              </Badge>
            ))}
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
        data={filteredData}
        margin={CHART_MARGIN}
        onMouseLeave={() => setHoveredLine(null)}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="weekLabel"
          tickMargin={8}
          padding={{ left: 0, right: 0 }}
          interval="preserveStartEnd"
          className="text-xs text-muted-foreground"
        />
        <YAxis
          allowDecimals={false}
          tickMargin={6}
          width={40}
          domain={[0, (dataMax: number) => Math.max(1, dataMax + 2)]}
          className="text-xs text-muted-foreground"
        />
        <Tooltip
          formatter={(value: any, key: string) => [`${value} Fails`, labelMap[key] ?? key]}
          labelFormatter={(label: string) => label}
          filterNull
          contentStyle={{ 
            borderRadius: 12, 
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))'
          }}
        />
        
        {/* Reference Lines - use ReferenceLine component to avoid tooltip issues */}
        {showReferences && milestoneThresholds.map((milestone, index) => (
          <ReferenceLine
            key={`reference-${index}`}
            y={milestone.value}
            stroke={milestone.color}
            strokeDasharray="3 3"
            ifOverflow="extendDomain"
          />
        ))}

        {/* Participant Lines */}
        {trendData?.participants.map((participant) => {
          const userKey = `user_${participant.userId}`;
          if (!visibleParticipants.has(participant.userId)) return null;
          
          const isHovered = hoveredLine === participant.name;
          
          return (
            <Line
              key={userKey}
              type="monotone"
              dataKey={userKey}
              stroke={participant.color}
              strokeWidth={isHovered ? 3 : 2.5}
              dot={false}
              activeDot={false}
              connectNulls
              onMouseEnter={() => setHoveredLine(participant.name)}
            />
          );
        })}
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
};