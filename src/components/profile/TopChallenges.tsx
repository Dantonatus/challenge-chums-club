import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface TopChallengesProps { userId: string; t: any }

export const TopChallenges = ({ userId, t }: TopChallengesProps) => {
  const navigate = useNavigate();

  const myParticipantQuery = useQuery({
    queryKey: ["top","participants", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("challenge_id, penalty_count")
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    }
  });

  const challengeIds = (myParticipantQuery.data || []).map((p) => p.challenge_id);

  const today = new Date().toISOString().slice(0,10);
  const challengesQuery = useQuery({
    enabled: challengeIds.length > 0,
    queryKey: ["top","challenges", challengeIds.join(","), today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id,title,start_date,end_date,penalty_cents")
        .in("id", challengeIds)
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data || [];
    }
  });

  const participantsQuery = useQuery({
    enabled: (challengesQuery.data || []).length > 0,
    queryKey: ["top","participantsAll", (challengesQuery.data||[]).map(c=>c.id).join(",")],
    queryFn: async () => {
      const ids = (challengesQuery.data || []).map((c) => c.id);
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("challenge_id,user_id,penalty_count")
        .in("challenge_id", ids);
      if (error) throw error;
      return data || [];
    }
  });

  const profileMapQuery = useQuery({
    enabled: (participantsQuery.data || []).length > 0,
    queryKey: ["top","profiles", (participantsQuery.data||[]).length],
    queryFn: async () => {
      const uids = Array.from(new Set((participantsQuery.data || []).map(p => p.user_id)));
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", uids);
      if (error) throw error;
      const map = new Map<string, string>();
      (data||[]).forEach(p => map.set(p.id, p.display_name || ""));
      return map;
    }
  });

  const loading = myParticipantQuery.isLoading || challengesQuery.isLoading || participantsQuery.isLoading || profileMapQuery.isLoading;

  const cards = useMemo(() => {
    const active = challengesQuery.data || [];
    // Simple relevance: sort by sum of penalty_count desc
    const sums = active.map((c) => {
      const participants = (participantsQuery.data || []).filter(p => p.challenge_id === c.id);
      const total = participants.reduce((s, p) => s + (p.penalty_count || 0), 0);
      return { c, total, participants };
    }).sort((a,b) => b.total - a.total).slice(0,3);
    return sums;
  }, [challengesQuery.data, participantsQuery.data]);

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <Card>
        <CardHeader><CardTitle>{t.top.title}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t.top.empty}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
      {cards.map(({ c, participants }) => {
        const leaderboard = [...participants].sort((a,b) => (b.penalty_count||0) - (a.penalty_count||0)).slice(0,3);
        return (
          <Card key={c.id} className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">{c.title}</CardTitle>
              <CardDescription>
                {c.start_date} — {c.end_date} · {t.top.penalty}: {(c.penalty_cents ?? 0)/100}€
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {leaderboard.map((p) => (
                  <li key={p.user_id} className="flex items-center justify-between">
                    <span className="truncate mr-2">{profileMapQuery.data?.get(p.user_id) || p.user_id}</span>
                    <span className="font-mono tabular-nums">{p.penalty_count ?? 0}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button size="sm" onClick={() => navigate(`/challenges/${c.id}`)}>{t.top.open}</Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
