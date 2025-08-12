import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Plus, Calendar as CalendarIcon, UserPlus } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import * as Recharts from "recharts";
import AddParticipantsDialog from "@/components/challenges/AddParticipantsDialog";

const t = {
  en: {
    title: "Challenge",
    participants: "Participants",
    extend: "Extend Challenge",
    addViolation: "Add violation",
    addParticipants: "Add participants",
    until: "until",
  },
  de: {
    title: "Challenge",
    participants: "Teilnehmer:innen",
    extend: "Challenge verlängern",
    addViolation: "Verstoß eintragen",
    addParticipants: "Teilnehmer:innen hinzufügen",
    until: "bis",
  },
};

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDate, setExtendDate] = useState<Date | undefined>();
  const [addOpen, setAddOpen] = useState(false);

  const { data: challenge, refetch } = useQuery({
    queryKey: ["challenge", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select("id, title, description, start_date, end_date, penalty_amount, group_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data!;
    },
  });

  const { data: cps, refetch: refetchCps } = useQuery({
    queryKey: ["challenge_participants", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenge_participants")
        .select("id, user_id, penalty_count")
        .eq("challenge_id", id);
      if (error) throw error;
      return data || [];
    },
  });

  const userIds = useMemo(() => (cps || []).map(p => p.user_id), [cps]);

  const { data: profiles } = useQuery({
    queryKey: ["profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`challenge-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_participants', filter: `challenge_id=eq.${id}` }, () => {
        refetchCps();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const rows = useMemo(() => {
    const list = (cps || []).map((p) => {
      const profile = (profiles || []).find(pr => pr.id === p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        name: profile?.display_name || p.user_id.slice(0, 6),
        avatar_url: profile?.avatar_url || undefined,
        penalty_count: p.penalty_count || 0,
      };
    });
    return list;
  }, [cps, profiles]);

  const colors = ["hsl(var(--primary))", "hsl(var(--secondary))", "#6f8cff", "#f39c12", "#2ecc71", "#e74c3c"];

  const chartData = rows.map((r, idx) => ({ name: r.name, count: r.penalty_count, fill: colors[idx % colors.length] }));

  const addViolation = async (cpId: string, current: number) => {
    try {
      const { error } = await (supabase as any)
        .from("challenge_participants")
        .update({ penalty_count: current + 1 })
        .eq("id", cpId);
      if (error) throw error;
      refetchCps();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' as any });
    }
  };

  const extendChallenge = async () => {
    if (!id || !extendDate) return;
    try {
      const iso = extendDate.toISOString().slice(0,10);
      const { error } = await (supabase as any).from('challenges').update({ end_date: iso }).eq('id', id);
      if (error) throw error;
      setExtendOpen(false);
      refetch();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' as any });
    }
  };

  if (!challenge) return null;

  const penalty = challenge.penalty_amount || 0;

  return (
    <section className="space-y-6 animate-enter">
      <Helmet>
        <title>{challenge.title} | Challenge</title>
        <meta name="description" content={challenge.description || "Challenge detail"} />
        <link rel="canonical" href={`/challenges/${challenge.id}`} />
      </Helmet>

      {/* fun tiny animation */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <svg width="44" height="28" viewBox="0 0 44 28" className="animate-fade-in">
          <circle cx="10" cy="14" r="6" fill="hsl(var(--primary))" opacity="0.9">
            <animate attributeName="cx" values="8;12;8" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="34" cy="14" r="6" fill="hsl(var(--secondary))" opacity="0.9">
            <animate attributeName="cx" values="36;32;36" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span className="text-sm">Shake hands, then compete kindly ✦</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{challenge.title}</span>
            <div className="flex gap-2">
              <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><CalendarIcon className="mr-1 h-4 w-4" /> Extend</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Extend Challenge</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start"><CalendarIcon className="mr-2 h-4 w-4" /> {extendDate ? format(extendDate, 'PPP') : 'Pick a date'}</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={extendDate}
                          onSelect={setExtendDate}
                          disabled={(date) => date < new Date(challenge.end_date as any)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
                      <Button onClick={extendChallenge} disabled={!extendDate}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><UserPlus className="mr-1 h-4 w-4" /> Add</Button>
            </div>
          </CardTitle>
          <CardDescription>
            {format(new Date(challenge.start_date as any), 'PPP')} – {format(new Date(challenge.end_date as any), 'PPP')} · €{penalty.toFixed(2)} per violation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Participants Row */}
          <div className="flex -space-x-2">
            {rows.map((r) => (
              <Avatar key={r.id} className="border-2 border-background">
                <AvatarImage src={r.avatar_url} alt={r.name} />
                <AvatarFallback>{r.name.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
          </div>

          {/* Chart */}
          <ChartContainer
            config={Object.fromEntries(rows.map((r, idx) => [r.name, { label: r.name, color: colors[idx % colors.length] }]))}
            className="w-full"
          >
            <Recharts.BarChart data={chartData}>
              <Recharts.CartesianGrid strokeDasharray="3 3" />
              <Recharts.XAxis dataKey="name" />
              <Recharts.YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Recharts.Bar dataKey="count" name="Violations" radius={[4,4,0,0]}>
                {chartData.map((entry, index) => (
                  <Recharts.Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Recharts.Bar>
            </Recharts.BarChart>
          </ChartContainer>

          {/* Actions per participant */}
          <div className="grid gap-3">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={r.avatar_url} alt={r.name} />
                    <AvatarFallback>{r.name.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-muted-foreground">{r.penalty_count} × €{penalty.toFixed(2)} = €{(r.penalty_count * penalty).toFixed(2)}</div>
                  </div>
                </div>
                <Button size="sm" onClick={() => addViolation(r.id, r.penalty_count)}><Plus className="mr-1 h-4 w-4" /> Add</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddParticipantsDialog open={addOpen} onOpenChange={setAddOpen} challengeId={id!} onAdded={() => refetchCps()} />
    </section>
  );
}
