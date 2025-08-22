import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, eachWeekOfInterval, getWeek, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import * as Recharts from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineSlider } from "@/components/charts/TimelineSlider";
import { useDateRange } from "@/contexts/DateRangeContext";
import { generateChartConfig, generateParticipantColorMap } from "@/lib/participant-colors";
import { Eye, TrendingUp } from "lucide-react";

interface Participant {
  user_id: string;
  name: string;
}

interface Props {
  challengeId: string;
  participants: Participant[];
}

export function CumulativePenaltyTrendChart({ challengeId, participants }: Props) {
  const { start, end } = useDateRange();
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set(participants.map(p => p.user_id))
  );
  
  // Generate weeks between start and end dates
  const weeks = useMemo(() => {
    if (!start || !end) return [];
    return eachWeekOfInterval(
      { start, end },
      { weekStartsOn: 1 } // Monday
    );
  }, [start, end]);
  
  const [weekRange, setWeekRange] = useState<[number, number]>([0, Math.max(0, weeks.length - 1)]);

  const { data: violations = [] } = useQuery({
    queryKey: ["challenge_violations_trend", challengeId, start?.toISOString(), end?.toISOString()],
    enabled: !!challengeId && !!start && !!end,
    queryFn: async () => {
      let query = supabase
        .from("challenge_violations")
        .select("id, user_id, amount_cents, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });
      
      // If challengeId is "all", don't filter by challenge_id
      if (challengeId !== "all") {
        query = query.eq("challenge_id", challengeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const colorMap = useMemo(() => generateParticipantColorMap(participants), [participants]);
  const chartConfig = useMemo(() => generateChartConfig(participants), [participants]);

  // Filter participants and violations
  const filteredParticipants = participants.filter(p => selectedParticipants.has(p.user_id));
  const filteredViolations = violations.filter(v => selectedParticipants.has(v.user_id));

  // Calculate total violations and amount for display
  const totalViolations = filteredViolations.length;
  const totalAmount = filteredViolations.reduce((sum, v) => sum + (v.amount_cents || 0), 0) / 100;

  const chartData = useMemo(() => {
    if (weeks.length === 0) return [];
    
    // Filter weeks based on selected range
    const selectedWeeks = weeks.slice(weekRange[0], weekRange[1] + 1);
    
    // Group violations by week and participant
    const violationsByWeek: Record<string, Record<string, number>> = {};
    
    for (const violation of filteredViolations) {
      const violationDate = new Date(violation.created_at);
      
      // Find which week this violation belongs to
      const weekIndex = selectedWeeks.findIndex(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        return isWithinInterval(violationDate, { start: weekStart, end: weekEnd });
      });
      
      if (weekIndex !== -1) {
        const weekKey = format(selectedWeeks[weekIndex], 'yyyy-MM-dd');
        violationsByWeek[weekKey] ||= {};
        violationsByWeek[weekKey][violation.user_id] = 
          (violationsByWeek[weekKey][violation.user_id] || 0) + (violation.amount_cents || 0);
      }
    }

    // Build chart data with cumulative values
    const cumulative: Record<string, number> = {};
    
    return selectedWeeks.map((weekStart) => {
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const weekNumber = getWeek(weekStart, { weekStartsOn: 1, firstWeekContainsDate: 4, locale: de });
      
      const row: any = { 
        week: `KW ${weekNumber}`,
        weekStart: weekKey
      };
      
      for (const participant of filteredParticipants) {
        const weekAmount = violationsByWeek[weekKey]?.[participant.user_id] || 0;
        cumulative[participant.user_id] = (cumulative[participant.user_id] || 0) + weekAmount;
        row[participant.name] = cumulative[participant.user_id] / 100; // Convert to euros
      }
      
      return row;
    });
  }, [weeks, weekRange, filteredViolations, filteredParticipants]);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAllParticipants = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.user_id)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Fails-Trend Premium</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {totalViolations} Gesamt Fails
            </Badge>
            <Badge variant="outline" className="text-destructive">
              €{totalAmount.toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Participant Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Teilnehmer</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllParticipants}
              className="flex items-center gap-1 text-xs"
            >
              <Eye className="h-3 w-3" />
              Referenzlinien
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {participants.map((participant, index) => {
              const isSelected = selectedParticipants.has(participant.user_id);
              const participantViolations = violations.filter(v => v.user_id === participant.user_id);
              const count = participantViolations.length;
              
              return (
                <Button
                  key={participant.user_id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleParticipant(participant.user_id)}
                  className="flex items-center gap-2 text-xs"
                  style={isSelected ? {
                    backgroundColor: colorMap[participant.user_id],
                    borderColor: colorMap[participant.user_id],
                    color: 'white'
                  } : {}}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colorMap[participant.user_id] }}
                  />
                  {participant.name}
                  <Badge 
                    variant="secondary" 
                    className="ml-1 text-xs"
                    style={isSelected ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : {}}
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
            <h4 className="text-sm font-medium text-muted-foreground">Nach Wochen filtern</h4>
            <TimelineSlider
              weeks={weeks}
              selectedRange={weekRange}
              onRangeChange={setWeekRange}
              lang="de"
            />
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-full">
              <Recharts.LineChart data={chartData}>
                <Recharts.CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <Recharts.XAxis 
                  dataKey="week" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Recharts.YAxis 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Fails', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: any, name: string) => [
                    `€${(value as number).toFixed(2)}`,
                    name
                  ]}
                />
                {filteredParticipants.map((participant) => (
                  <Recharts.Line
                    key={participant.user_id}
                    type="linear"
                    dataKey={participant.name}
                    stroke={colorMap[participant.user_id]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </Recharts.LineChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p>Keine Daten für den ausgewählten Zeitraum</p>
                <p className="text-xs mt-1">
                  Debug: Wochen: {weeks.length}, Verstöße: {filteredViolations.length}, Teilnehmer: {filteredParticipants.length}
                </p>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}