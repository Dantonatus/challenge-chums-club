import { useMemo } from "react";
import { format, eachDayOfInterval } from "date-fns";
import * as Recharts from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDateRange } from "@/contexts/DateRangeContext";

interface Participant {
  user_id: string;
  name: string;
}

interface Props {
  challengeId: string;
  participants: Participant[];
}

const colors = [
  "hsl(var(--primary))",
  "hsl(217 91% 60%)", // Bright blue - good contrast
  "hsl(142 76% 36%)", // Strong green  
  "hsl(38 92% 50%)", // Vibrant orange
  "hsl(348 83% 47%)", // Strong red
  "hsl(271 81% 56%)", // Purple
  "hsl(195 85% 41%)", // Teal
  "hsl(55 92% 50%)", // Bright yellow
];

export default function CumulativePenaltyChart({ challengeId, participants }: Props) {
  const { start, end } = useDateRange();

  const { data: violations = [] } = useQuery({
    queryKey: ["challenge_violations", challengeId, start?.toISOString(), end?.toISOString()],
    enabled: !!challengeId && !!start && !!end,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenge_violations")
        .select("id, user_id, amount_cents, created_at")
        .eq("challenge_id", challengeId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  const chartConfig = useMemo(() =>
    Object.fromEntries(participants.map((p, idx) => [p.name, { label: p.name, color: colors[idx % colors.length] }])),
  [participants]);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start, end });

    const sumsByDay: Record<string, Record<string, number>> = {};
    for (const v of violations as any[]) {
      const dayKey = format(new Date(v.created_at), 'yyyy-MM-dd');
      sumsByDay[dayKey] ||= {};
      sumsByDay[dayKey][v.user_id] = (sumsByDay[dayKey][v.user_id] || 0) + (v.amount_cents || 0);
    }

    const cumulative: Record<string, number> = {};
    const rows = days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const row: any = { date: format(d, 'MMM d') };
      for (const p of participants) {
        const todayCents = sumsByDay[key]?.[p.user_id] || 0;
        cumulative[p.user_id] = (cumulative[p.user_id] || 0) + todayCents;
        row[p.name] = (cumulative[p.user_id] || 0) / 100; // euros
      }
      return row;
    });

    return rows;
  }, [violations, participants, start, end]);

  return (
    <ChartContainer config={chartConfig} className="w-full h-56 md:h-64" withAspect={false}>
      <Recharts.LineChart data={chartData}>
        <Recharts.CartesianGrid strokeDasharray="3 3" />
        <Recharts.XAxis dataKey="date" />
        <Recharts.YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        {participants.map((p, idx) => (
          <Recharts.Line key={p.user_id} type="monotone" dataKey={p.name} stroke={colors[idx % colors.length]} dot={false} strokeWidth={2} />
        ))}
      </Recharts.LineChart>
    </ChartContainer>
  );
}
