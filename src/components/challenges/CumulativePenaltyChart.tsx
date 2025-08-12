import { useMemo, useState } from "react";
import { format, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as Recharts from "recharts";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Participant {
  user_id: string;
  name: string;
}

interface Props {
  challengeId: string;
  participants: Participant[];
  defaultStart: Date;
  defaultEnd: Date;
}

const colors = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "#6f8cff",
  "#f39c12",
  "#2ecc71",
  "#e74c3c",
  "#8e44ad",
];

export default function CumulativePenaltyChart({ challengeId, participants, defaultStart, defaultEnd }: Props) {
  const [start, setStart] = useState<Date>(defaultStart);
  const [end, setEnd] = useState<Date>(defaultEnd);

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

    // Map of date->user_id->sumCents on that day
    const sumsByDay: Record<string, Record<string, number>> = {};
    for (const v of violations as any[]) {
      const day = (v.created_at || new Date()).toString().slice(0, 10);
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" /> {start ? format(start, 'PPP') : 'Start'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={start} onSelect={(d) => d && setStart(d)} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" /> {end ? format(end, 'PPP') : 'Ende'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={end} onSelect={(d) => d && setEnd(d)} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

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
    </div>
  );
}
