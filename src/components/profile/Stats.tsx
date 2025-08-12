import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatEUR } from "@/lib/currency";
import { useDateRange } from "@/contexts/DateRangeContext";

interface StatsProps { userId: string; t: any }

export const Stats = ({ userId, t }: StatsProps) => {
  const { start, end } = useDateRange();
  const startISODate = start.toISOString().slice(0,10);
  const endISODate = end.toISOString().slice(0,10);
  const from30 = new Date(Date.now() - 30*24*60*60*1000).toISOString();

  // Active challenges overlapping the selected range
  const challengesQuery = useQuery({
    queryKey: ["stats","challenges", startISODate, endISODate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id,start_date,end_date")
        .lte("start_date", endISODate)
        .gte("end_date", startISODate);
      if (error) throw error;
      return data || [];
    }
  });

  // Violations count (range)
  const violationsQuery = useQuery({
    queryKey: ["stats","violations-range", userId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  // Outstanding in selected range
  const outstandingQuery = useQuery({
    enabled: !!userId,
    queryKey: ["stats","outstanding", userId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("amount_cents, created_at")
        .eq("user_id", userId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  const outstandingCents = useMemo(() => {
    return (outstandingQuery.data || []).reduce((sum, v) => sum + (v.amount_cents || 0), 0);
  }, [outstandingQuery.data]);

  const loading = challengesQuery.isLoading || violationsQuery.isLoading || outstandingQuery.isLoading;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-6"><Skeleton className="h-8 w-24" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-8 w-24" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-8 w-32" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.stats.active}</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="text-3xl font-semibold">{challengesQuery.data?.length ?? 0}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.stats.violations30}</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="text-3xl font-semibold">{violationsQuery.data?.length ?? 0}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.stats.outstanding}</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="text-3xl font-semibold">{formatEUR(outstandingCents)}</div></CardContent>
      </Card>
    </div>
  );
};
