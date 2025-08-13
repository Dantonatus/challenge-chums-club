import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ChallengeForm from "@/components/challenges/ChallengeForm";
import { ChallengeTypeToggle } from "@/components/challenges/ChallengeTypeToggle";
import { KPIChallengeForm } from "@/components/challenges/KPIChallengeForm";
import { supabase } from "@/integrations/supabase/client";

const t = {
  de: {
    title: "Übersicht",
    subtitle: "Aktive Challenges deiner Gruppen",
    none: "Keine aktiven Challenges",
    perViolation: "pro Verstoß",
    participants: (n: number) => `${n} Teilnehmer`,
    view: "Zur Challenge",
    create: "Neue Challenge",
  },
  en: {
    title: "Overview",
    subtitle: "Active challenges in your groups",
    none: "No active challenges",
    perViolation: "per violation",
    participants: (n: number) => `${n} participants`,
    view: "View challenge",
    create: "New challenge",
  },
};

export default function OverviewPage() {
  const lang: keyof typeof t = 'de';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [groupToCreate, setGroupToCreate] = useState<string | null>(null);
  const [challengeType, setChallengeType] = useState<'habit' | 'kpi'>('habit');
  const openCreate = (gid: string) => { setGroupToCreate(gid); setOpen(true); };

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, description")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const groupIds = (groups || []).map((g: any) => g.id);

  const { data: challenges } = useQuery({
    queryKey: ["overview_challenges", groupIds],
    enabled: groupIds.length > 0,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select(`
          id, 
          title, 
          description, 
          start_date, 
          end_date, 
          penalty_amount, 
          group_id,
          challenge_type,
          kpi_definitions (
            id,
            kpi_type,
            target_value,
            unit
          )
        `)
        .in("group_id", groupIds)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const challengeIds = (challenges || []).map((c: any) => c.id);

  const { data: participants } = useQuery({
    queryKey: ["overview_participants", challengeIds],
    enabled: challengeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenge_participants")
        .select("id, challenge_id")
        .in("challenge_id", challengeIds);
      if (error) throw error;
      return data || [];
    },
  });

  const countByChallenge = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of (participants || []) as any[]) {
      map[p.challenge_id] = (map[p.challenge_id] || 0) + 1;
    }
    return map;
  }, [participants]);

  const byGroup = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const c of (challenges || []) as any[]) {
      (map[c.group_id] ||= []).push(c);
    }
    return map;
  }, [challenges]);

  return (
    <section className="space-y-6 animate-enter">
      <Helmet>
        <title>{t[lang].title} | Challenges</title>
        <meta name="description" content="Personalisierte Übersicht deiner Gruppen und aktiven Strafen-Challenges" />
        <link rel="canonical" href="/app/overview" />
      </Helmet>

      <header>
        <h1 className="text-2xl font-semibold">{t[lang].title}</h1>
        <p className="text-muted-foreground">{t[lang].subtitle}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {(groups || []).map((g: any) => (
          <Card key={g.id} className="animate-fade-in">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{g.name}</CardTitle>
                <Button size="sm" onClick={() => openCreate(g.id)}>{t[lang].create}</Button>
              </div>
              <CardDescription>{g.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(byGroup[g.id] || []).length === 0 && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">{t[lang].none}</div>
                  <Button size="sm" onClick={() => openCreate(g.id)}>{t[lang].create}</Button>
                </div>
              )}
              {(byGroup[g.id] || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {c.challenge_type === 'kpi' && c.kpi_definitions?.[0] && (
                        <span className="text-lg">
                          {c.kpi_definitions[0].kpi_type === 'steps' ? '🚶' : 
                           c.kpi_definitions[0].kpi_type === 'sleep_hours' ? '😴' : 
                           c.kpi_definitions[0].kpi_type === 'hrv' ? '❤️' : 
                           c.kpi_definitions[0].kpi_type === 'resting_hr' ? '💓' : '📊'}
                        </span>
                      )}
                      {c.title}
                      {c.challenge_type === 'kpi' && (
                        <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                          KPI
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(c.start_date as any), 'PPP')} – {format(new Date(c.end_date as any), 'PPP')}
                      {c.challenge_type === 'habit' && (
                        <span> · €{(c.penalty_amount || 0).toFixed(2)} {t[lang].perViolation}</span>
                      )}
                      {c.challenge_type === 'kpi' && c.kpi_definitions?.[0] && (
                        <span> · Ziel: {c.kpi_definitions[0].target_value} {c.kpi_definitions[0].unit}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t[lang].participants(countByChallenge[c.id] || 0)}
                    </div>
                  </div>
                  <Link to={`/challenges/${c.id}`}>
                    <Button variant="outline" size="sm">{t[lang].view}</Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setGroupToCreate(null); setChallengeType('habit'); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t[lang].create}</DialogTitle>
          </DialogHeader>
          {groupToCreate && (
            <div className="space-y-4">
              <ChallengeTypeToggle value={challengeType} onValueChange={setChallengeType} />
              
              {challengeType === 'habit' ? (
                <ChallengeForm
                  groupId={groupToCreate}
                  locale={lang}
                  onCancel={() => setOpen(false)}
                  onSaved={() => {
                    setOpen(false);
                    setGroupToCreate(null);
                    setChallengeType('habit');
                    queryClient.invalidateQueries();
                  }}
                />
              ) : (
                <KPIChallengeForm
                  groupId={groupToCreate}
                  onSuccess={() => {
                    setOpen(false);
                    setGroupToCreate(null);
                    setChallengeType('habit');
                    queryClient.invalidateQueries();
                  }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

