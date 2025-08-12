import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface TrendsProps { userId: string; t: any }

export const Trends = ({ userId, t }: TrendsProps) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 6 months window
  const monthKeys = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const challengesQuery = useQuery({
    queryKey: ["trends","challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id,start_date,end_date");
      if (error) throw error;
      return data || [];
    }
  });

  const violationsQuery = useQuery({
    enabled: !!userId,
    queryKey: ["trends","violations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("amount_cents, created_at")
        .eq("user_id", userId)
        .gte("created_at", start.toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  const data = useMemo(() => {
    const monthLabel = (key: string) => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, (m - 1), 1);
      return d.toLocaleDateString(undefined, { month: 'short' });
    };

    const chByMonth: Record<string, number> = Object.fromEntries(monthKeys.map(k => [k, 0]));
    (challengesQuery.data || []).forEach(c => {
      const s = new Date(c.start_date);
      const e = new Date(c.end_date);
      monthKeys.forEach(k => {
        const [y, m] = k.split('-').map(Number);
        const ms = new Date(y, m - 1, 1);
        const me = new Date(y, m, 0, 23, 59, 59);
        if (s <= me && e >= ms) chByMonth[k] += 1; // active overlap in that month
      });
    });

    const penByMonth: Record<string, number> = Object.fromEntries(monthKeys.map(k => [k, 0]));
    (violationsQuery.data || []).forEach(v => {
      const d = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in penByMonth) penByMonth[key] += v.amount_cents || 0;
    });

    return monthKeys.map(k => ({
      m: monthLabel(k),
      challenges: chByMonth[k],
      penalties: (penByMonth[k] || 0) / 100,
    }));
  }, [challengesQuery.data, violationsQuery.data]);

  const loading = challengesQuery.isLoading || violationsQuery.isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t?.charts?.lineTitle || 'Trends'}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ChartContainer config={{ challenges: { label: 'Challenges', color: 'hsl(var(--primary))' }, penalties: { label: '€', color: 'hsl(var(--muted-foreground))' } }}>
            <LineChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="m" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="challenges" stroke="var(--color-challenges)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="penalties" stroke="var(--color-penalties)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
