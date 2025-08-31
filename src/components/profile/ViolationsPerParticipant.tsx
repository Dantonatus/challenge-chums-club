import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/contexts/DateRangeContext";
import { generateParticipantColorMap } from "@/lib/participant-colors";

interface Participant { user_id: string; name: string }

export default function ViolationsPerParticipant({ challengeId, participants }: { challengeId: string; participants: Participant[] }) {
  const { start, end } = useDateRange();

  const { data, isLoading } = useQuery({
    enabled: !!challengeId,
    queryKey: ["violations-per-participant", challengeId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("user_id, amount_cents, created_at")
        .eq("challenge_id", challengeId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  const colorMap = useMemo(() => generateParticipantColorMap(participants), [participants]);

  const barData = useMemo(() => {
    const sums = new Map<string, number>();
    (data || []).forEach((v: any) => {
      sums.set(v.user_id, (sums.get(v.user_id) || 0) + (v.amount_cents || 0));
    });
    return participants.map((p) => ({
      name: p.name,
      amount: Math.round(((sums.get(p.user_id) || 0) / 100) * 100) / 100,
      fill: colorMap[p.user_id],
    }));
  }, [data, participants, colorMap]);

  if (isLoading) return <Skeleton className="h-full w-full" />;

  if (!barData.length || barData.every(d => d.amount === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="text-4xl mb-4">🏆</div>
        <p className="text-center text-sm">No violations found - excellent work!</p>
      </div>
    );
  }

  return (
    <ChartContainer 
      config={{ amount: { label: "€", color: "hsl(var(--primary))" } }}
      className="h-full w-full"
    >
      <BarChart data={barData} height={300}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          tickLine={false} 
          axisLine={false} 
          interval={0} 
          height={60} 
          angle={-45} 
          textAnchor="end"
          fontSize={12}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          tickLine={false} 
          axisLine={false}
          fontSize={12}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar 
          dataKey="amount" 
          radius={[8,8,0,0]}
          className="hover:opacity-80 transition-opacity"
        />
      </BarChart>
    </ChartContainer>
  );
}
