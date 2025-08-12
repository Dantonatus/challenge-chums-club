import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GroupSelect } from "@/components/GroupSelect";
import ChallengeForm from "@/components/challenges/ChallengeForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const currency = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(n);

export default function ChallengesList() {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { data: challenges, refetch } = useQuery({
    queryKey: ["challenges", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0,10);
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select("id, title, description, start_date, end_date, penalty_amount, group_id")
        .eq("group_id", groupId)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const challengeIds = useMemo(() => (challenges || []).map(c => c.id), [challenges]);

  const { data: participants } = useQuery({
    queryKey: ["challenge_participants", challengeIds],
    enabled: challengeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenge_participants")
        .select("id, challenge_id, user_id, penalty_count")
        .in("challenge_id", challengeIds);
      if (error) throw error;
      return data || [];
    },
  });

  const totalsByChallenge = useMemo(() => {
    const map: Record<string, { count: number; total: number }[]> = {};
    for (const c of challenges || []) {
      const rows = (participants || []).filter(p => p.challenge_id === c.id);
      map[c.id] = rows.map(r => ({ count: r.penalty_count || 0, total: (r.penalty_count || 0) * (c.penalty_amount || 0) }));
    }
    return map;
  }, [participants, challenges]);

  return (
    <section>
      <Helmet>
        <title>Challenges | Active | Character Challenge</title>
        <meta name="description" content="Browse your active challenges, see totals per member, and open details." />
        <link rel="canonical" href="/challenges" />
      </Helmet>

      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Challenges</h1>
        <div className="flex items-center gap-3">
          <GroupSelect value={groupId} onChange={setGroupId} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!groupId}>New</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create challenge</DialogTitle>
              </DialogHeader>
              {groupId && (
                <ChallengeForm
                  groupId={groupId}
                  onCancel={() => setOpen(false)}
                  onSaved={() => {
                    setOpen(false);
                    refetch();
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(challenges || []).map((c) => {
          const totals = totalsByChallenge[c.id] || [];
          return (
            <Card key={c.id} className="animate-fade-in">
              <CardHeader>
                <CardTitle>{c.title}</CardTitle>
                <CardDescription>
                  {format(new Date(c.start_date as any), 'PPP')} – {format(new Date(c.end_date as any), 'PPP')} · €{(c.penalty_amount || 0).toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {totals.length} participants
                  </div>
                  <Link to={`/challenges/${c.id}`}>
                    <Button variant="outline" size="sm">View Challenge</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
