import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ActivityFeedProps { userId: string; t: any }

export const ActivityFeed = ({ userId, t }: ActivityFeedProps) => {
  const from30 = new Date(Date.now() - 30*24*60*60*1000).toISOString();

  const myGroupsQuery = useQuery({
    queryKey: ["feed","my-groups", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, created_at")
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    }
  });

  const groups = (myGroupsQuery.data || []).map(g => g.group_id);

  const othersJoinQuery = useQuery({
    enabled: groups.length > 0,
    queryKey: ["feed","others-join", groups.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, user_id, created_at")
        .in("group_id", groups)
        .neq("user_id", userId)
        .gte("created_at", from30)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    }
  });

  const myViolationsQuery = useQuery({
    queryKey: ["feed","violations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("id, challenge_id, amount_cents, created_at")
        .eq("user_id", userId)
        .gte("created_at", from30)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    }
  });

  const challengesMetaQuery = useQuery({
    enabled: (myViolationsQuery.data || []).length > 0,
    queryKey: ["feed","ch-meta", (myViolationsQuery.data||[]).length],
    queryFn: async () => {
      const ids = Array.from(new Set((myViolationsQuery.data||[]).map(v => v.challenge_id)));
      const { data, error } = await supabase
        .from("challenges")
        .select("id,title")
        .in("id", ids);
      if (error) throw error;
      const map = new Map<string, string>();
      (data||[]).forEach(c => map.set(c.id, c.title));
      return map;
    }
  });

  const profilesMapQuery = useQuery({
    enabled: (othersJoinQuery.data || []).length > 0,
    queryKey: ["feed","profiles", (othersJoinQuery.data||[]).length],
    queryFn: async () => {
      const ids = Array.from(new Set((othersJoinQuery.data||[]).map(j => j.user_id)));
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      if (error) throw error;
      const map = new Map<string, string>();
      (data||[]).forEach(p => map.set(p.id, p.display_name || ""));
      return map;
    }
  });

  const loading = myGroupsQuery.isLoading || othersJoinQuery.isLoading || myViolationsQuery.isLoading || challengesMetaQuery.isLoading || profilesMapQuery.isLoading;

  const items = useMemo(() => {
    const arr: { id: string; text: string; at: string }[] = [];
    (myViolationsQuery.data||[]).forEach(v => {
      const title = challengesMetaQuery.data?.get(v.challenge_id) || t.feed.challenge;
      const amount = (v.amount_cents || 0) / 100;
      arr.push({ id: `v-${v.id}`, text: `${t.feed.youViolation} ${title} (+€${amount.toFixed(2)})`, at: v.created_at });
    });
    (othersJoinQuery.data||[]).forEach(j => {
      const name = profilesMapQuery.data?.get(j.user_id) || t.feed.someone;
      arr.push({ id: `j-${j.user_id}-${j.created_at}`, text: `${name} ${t.feed.joinedGroup}`, at: j.created_at });
    });
    return arr.sort((a,b) => (a.at>b.at?-1:1)).slice(0,10);
  }, [myViolationsQuery.data, othersJoinQuery.data, challengesMetaQuery.data, profilesMapQuery.data, t]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>{t.feed.title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card>
        <CardHeader><CardTitle>{t.feed.title}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t.feed.empty}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t.feed.title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {items.map(it => (
            <li key={it.id} className="flex items-center justify-between gap-4">
              <span className="truncate">{it.text}</span>
              <time className="text-muted-foreground whitespace-nowrap">{new Date(it.at).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
