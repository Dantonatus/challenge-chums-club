import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek, isWithinInterval } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { TimelineSlider } from "@/components/charts/TimelineSlider";
import { InteractiveLegend } from "@/components/charts/InteractiveLegend";
import { EnhancedTooltip } from "@/components/charts/EnhancedTooltip";
import { TrendingUp, Calendar, Target, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompareBar } from "./CompareBar";

interface FailsTrendPremiumProps {
  lang: 'de' | 'en';
  compareMode?: boolean;
  onCompareParticipants?: (participantA: string, participantB: string) => void;
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

// Premium pastel color palette - soft, Apple-style colors
const PASTEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
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
      lowRisk: "Niedriges Risiko",
      references: "Referenzlinien",
      compare: "Vergleichen",
      difference: "Differenz",
      maxDiff: "Max Δ"
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
    if (trendData && trendData.weeks.length > 0) {
      // Always reset to show all weeks
      setTimelineRange([0, trendData.weeks.length - 1]);
      
      if (visibleParticipants.size === 0) {
        setVisibleParticipants(new Set(trendData.participants.map(p => p.name)));
      }
    }
  }, [trendData?.weeks.length]);

  // Filter data based on timeline selection and add comparison data
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
      trendData.participants.map(p => week[p.name] as number || 0)
    ));
    
    return [
      { value: Math.ceil(maxFails * 0.3), label: t[lang].lowRisk, color: '#10B981' },
      { value: Math.ceil(maxFails * 0.6), label: t[lang].moderate, color: '#F59E0B' },
      { value: Math.ceil(maxFails * 0.8), label: t[lang].highRisk, color: '#EF4444' }
    ];
  }, [trendData, lang, t]);

  if (isLoading) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!trendData || trendData.data.length === 0) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
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
    <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-all duration-300">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t[lang].title}
          </CardTitle>
          
          {/* Summary Stats */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <Target className="w-3 h-3 mr-1" />
              {trendData.participants.reduce((sum, p) => sum + p.totalFails, 0)} {t[lang].totalFails}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <AlertTriangle className="w-3 h-3 mr-1" />
              €{(trendData.participants.reduce((sum, p) => sum + p.totalPenalties, 0) / 100).toFixed(2)}
            </Badge>
          </div>
        </div>

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

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
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

          {/* Reference Lines Toggle */}
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
        <ChartContainer config={chartConfig} className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={filteredData} 
              margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <defs>
                {/* Gradient definitions for each participant */}
                {trendData.participants.map((participant) => (
                  <linearGradient
                    key={`gradient-${participant.name}`}
                    id={`gradient-${participant.name.replace(/\s+/g, '-')}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={participant.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={participant.color} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--muted-foreground))" 
                opacity={0.2}
                horizontal={true}
                vertical={false}
              />
              
              <XAxis 
                dataKey="week"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                tickLine={false}
                dy={10}
              />
              
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                tickLine={false}
                label={{ 
                  value: t[lang].fails, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />

              <EnhancedTooltip lang={lang} />

              {/* Dynamic Lines with gradients */}
              {trendData.participants.map((participant) => {
                const isVisible = visibleParticipants.has(participant.name);
                const isHovered = hoveredLine === participant.name;
                
                return (
                  <Line
                    key={participant.name}
                    type="linear"
                    dataKey={participant.name}
                    stroke={participant.color}
                    strokeWidth={isHovered ? 4 : 2.5}
                    fill={`url(#gradient-${participant.name.replace(/\s+/g, '-')})`}
                    fillOpacity={isVisible ? 0.3 : 0}
                    dot={false}
                    activeDot={{ 
                      r: isHovered ? 8 : 6,
                      strokeWidth: 2,
                      fill: participant.color,
                      stroke: 'hsl(var(--background))',
                      style: {
                        filter: `drop-shadow(0 0 ${isHovered ? 12 : 8}px ${participant.color})`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }
                    }}
                    connectNulls={false}
                    opacity={isVisible ? (isHovered ? 1 : 0.8) : 0}
                    onMouseEnter={() => setHoveredLine(participant.name)}
                    style={{
                      filter: isHovered ? `drop-shadow(0 0 12px ${participant.color}40)` : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                );
              })}

              {/* Difference line for comparison */}
              {compareMode && compareParticipants[0] && compareParticipants[1] && (
                <Line
                  type="linear"
                  dataKey={`${t[lang].difference} (${compareParticipants[0]} - ${compareParticipants[1]})`}
                  stroke="#6B7280"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  dot={false}
                  activeDot={{ 
                    r: 6,
                    strokeWidth: 2,
                    fill: "#6B7280",
                    stroke: 'hsl(var(--background))'
                  }}
                  opacity={0.8}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Milestone Legend */}
        {showReferences && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t[lang].milestones}</h4>
            <div className="flex flex-wrap gap-3">
              {milestoneThresholds.map((milestone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: milestone.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {milestone.label} ({milestone.value}+)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};