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

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!barData.length) return <div className="text-sm text-muted-foreground">Keine Daten verfügbar</div>;

  return (
    <ChartContainer config={{ amount: { label: "€", color: "hsl(var(--primary))" } }}>
      <BarChart data={barData}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={60} angle={0} dy={10} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="amount" radius={[6,6,0,0]} />
      </BarChart>
    </ChartContainer>
  );
}
