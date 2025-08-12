import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
aimport { useQuery } from "@tanstack/react-query";
import { formatEUR } from "@/lib/currency";
import { useDateRange } from "@/contexts/DateRangeContext";

interface StatsProps { userId: string; t: any }

export const Stats = ({ userId, t }: StatsProps) => {
  const today = new Date().toISOString().slice(0,10);
  const from30 = new Date(Date.now() - 30*24*60*60*1000).toISOString();

  const challengesQuery = useQuery({
    queryKey: ["stats","challenges", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id,start_date,end_date")
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data || [];
    }
  });

  const violationsQuery = useQuery({
    queryKey: ["stats","violations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("amount_cents, created_at")
        .gte("created_at", from30)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const outstandingCents = useMemo(() => {
    return (violationsQuery.data || []).reduce((sum, v) => sum + (v.amount_cents || 0), 0);
  }, [violationsQuery.data]);

  const loading = challengesQuery.isLoading || violationsQuery.isLoading;

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
