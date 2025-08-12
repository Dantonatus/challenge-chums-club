import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const t = {
  de: {
    title: "Übersicht",
    subtitle: "Aktive Challenges deiner Gruppen",
    none: "Keine aktiven Challenges",
    perViolation: "pro Verstoß",
    participants: (n: number) => `${n} Teilnehmer`,
    view: "Zur Challenge",
  },
  en: {
    title: "Overview",
    subtitle: "Active challenges in your groups",
    none: "No active challenges",
    perViolation: "per violation",
    participants: (n: number) => `${n} participants`,
    view: "View challenge",
  },
};

export default function OverviewPage() {
  const lang: keyof typeof t = 'de';

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
        .select("id, title, description, start_date, end_date, penalty_amount, group_id")
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
            <CardHeader>
              <CardTitle>{g.name}</CardTitle>
              <CardDescription>{g.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(byGroup[g.id] || []).length === 0 && (
                <div className="text-sm text-muted-foreground">{t[lang].none}</div>
              )}
              {(byGroup[g.id] || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(c.start_date as any), 'PPP')} – {format(new Date(c.end_date as any), 'PPP')} · €{(c.penalty_amount || 0).toFixed(2)} {t[lang].perViolation}
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
    </section>
  );
}
