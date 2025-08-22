import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Plus, Calendar as CalendarIcon, UserPlus, Pencil, Trash2, ArrowLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import * as Recharts from "recharts";
import AddParticipantsDialog from "@/components/challenges/AddParticipantsDialog";
import ChallengeForm from "@/components/challenges/ChallengeForm";
import CumulativePenaltyChart from "@/components/challenges/CumulativePenaltyChart";
import { KPIDetailChart } from "@/components/challenges/KPIDetailChart";
import { KPIDataEntry } from "@/components/challenges/KPIDataEntry";
import { ViolationEntryDialog } from "@/components/challenges/ViolationEntryDialog";
import ViolationsPerParticipant from "@/components/profile/ViolationsPerParticipant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateParticipantColorMap } from "@/lib/participant-colors";

const t = {
  en: {
    title: "Challenge",
    participants: "Participants",
    extend: "Extend challenge",
    addViolation: "Add violation",
    addParticipants: "Add participants",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save",
    pickDate: "Pick a date",
    perViolation: "per violation",
    until: "until",
    back: "Back",
    tagline: "Shake hands, then compete kindly ✦",
  },
  de: {
    title: "Challenge",
    participants: "Teilnehmer:innen",
    extend: "Challenge verlängern",
    addViolation: "Verstoß eintragen",
    addKPIData: "KPI Daten eingeben",
    addParticipants: "Teilnehmer:innen hinzufügen",
    edit: "Bearbeiten",
    delete: "Löschen",
    cancel: "Abbrechen",
    save: "Speichern",
    pickDate: "Datum wählen",
    perViolation: "pro Verstoß",
    until: "bis",
    back: "Zurück",
    tagline: "Hände schütteln, dann freundlich wetteifern ✦",
  },
};

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDate, setExtendDate] = useState<Date | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [violationOpen, setViolationOpen] = useState(false);
  const [kpiDataOpen, setKpiDataOpen] = useState(false);
  const [violationDate, setViolationDate] = useState<Date | undefined>(new Date());
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("monitoring");
  const lang: keyof typeof t = 'de';

  // Check URL parameters for tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  // Get current user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const { data: challenge, refetch } = useQuery({
    queryKey: ["challenge", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select(`
          id, 
          title, 
          description, 
          start_date, 
          end_date, 
          penalty_amount, 
          penalty_cents, 
          group_id,
          challenge_type,
          kpi_definitions (
            id,
            kpi_type,
            target_value,
            unit,
            measurement_frequency,
            aggregation_method,
            goal_direction
          )
        `)
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
        .select("id, user_id, penalty_count, penalty_override_cents")
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
        penalty_override_cents: (p as any).penalty_override_cents ?? null,
      };
    });
    return list;
  }, [cps, profiles]);

  const colorMap = useMemo(() => {
    if (!rows.length) return {};
    return generateParticipantColorMap(rows.map(r => ({ user_id: r.user_id, name: r.name })));
  }, [rows]);

  const chartData = rows.map((r) => ({ 
    name: r.name, 
    count: r.penalty_count, 
    fill: colorMap[r.user_id] 
  }));

  const addViolation = async (count: number = 1, createdAt?: Date) => {
    if (!selectedRow) return;
    
    try {
      const amountCents = (selectedRow.penalty_override_cents ?? challenge?.penalty_cents ?? Math.round((challenge?.penalty_amount || 0) * 100)) as number;

      // Insert violations based on count
      const violationPromises = [];
      for (let i = 0; i < count; i++) {
        violationPromises.push(
          (supabase as any)
            .from('challenge_violations')
            .insert({
              challenge_id: id,
              user_id: selectedRow.user_id,
              amount_cents: amountCents,
              created_at: createdAt ? createdAt.toISOString() : undefined,
            })
        );
      }

      // Execute all violation inserts
      const results = await Promise.all(violationPromises);
      const hasError = results.find(result => result.error);
      if (hasError) throw hasError.error;

      // Update counter in participants table
      const { error } = await (supabase as any)
        .from('challenge_participants')
        .update({ penalty_count: selectedRow.penalty_count + count })
        .eq('id', selectedRow.id);
      if (error) throw error;

      refetchCps();
      qc.invalidateQueries({ queryKey: ["challenge_violations"] });
      toast({ title: 'Verstoß hinzugefügt', description: `${count} Verstoß${count > 1 ? 'e' : ''} für ${selectedRow.name} hinzugefügt.` });
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

  const deleteChallenge = async () => {
    if (!id) return;
    try {
      const { error } = await (supabase as any).from('challenges').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Challenge gelöscht' });
      navigate('/app/challenges');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' as any });
    }
  };

  if (!challenge) return null;

  const penalty = challenge.penalty_amount || 0;
  const isKPIChallenge = challenge.challenge_type === 'kpi';
  const kpiDefinition = challenge.kpi_definitions?.[0];

  const getKPIIcon = (kpiType: string) => {
    switch (kpiType) {
      case "steps": return "🚶";
      case "sleep_hours": return "😴";
      case "hrv": return "❤️";
      case "resting_hr": return "💓";
      default: return "📊";
    }
  };

  return (
    <section className="space-y-6 animate-enter">
      <Helmet>
        <title>{challenge.title} | Challenge</title>
        <meta name="description" content={challenge.description || "Challenge detail"} />
        <link rel="canonical" href={`/challenges/${challenge.id}`} />
      </Helmet>

      {/* Back + fun tiny animation */}
      <div className="flex items-center justify-between text-muted-foreground">
        <Button variant="ghost" size="sm" asChild aria-label={t[lang].back}>
          <Link to="/app/challenges">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t[lang].back}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <svg width="44" height="28" viewBox="0 0 44 28" className="animate-fade-in">
            <circle cx="10" cy="14" r="6" fill="hsl(var(--primary))" opacity="0.9">
              <animate attributeName="cx" values="8;12;8" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="34" cy="14" r="6" fill="hsl(var(--secondary))" opacity="0.9">
              <animate attributeName="cx" values="36;32;36" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </svg>
          <span className="text-sm">{t[lang].tagline}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isKPIChallenge && kpiDefinition && (
                <span className="text-2xl">{getKPIIcon(kpiDefinition.kpi_type)}</span>
              )}
              <span>{challenge.title}</span>
              {isKPIChallenge && (
                <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  KPI
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {/* Extend */}
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

              {/* Add participants */}
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><UserPlus className="mr-1 h-4 w-4" /> {t[lang].addParticipants}</Button>

              {/* Edit challenge */}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Pencil className="mr-1 h-4 w-4" /> {t[lang].edit}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Edit Challenge</DialogTitle>
                  </DialogHeader>
                  <ChallengeForm
                    groupId={challenge.group_id}
                    challengeId={challenge.id}
                    initialValues={{
                      title: challenge.title,
                      description: challenge.description,
                      start_date: new Date(challenge.start_date as any) as any,
                      end_date: new Date(challenge.end_date as any) as any,
                      penalty_amount: challenge.penalty_amount,
                    }}
                    onSaved={() => { setEditOpen(false); refetch(); }}
                    onCancel={() => setEditOpen(false)}
                  />
                </DialogContent>
              </Dialog>

              {/* Delete challenge */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-4 w-4" /> {t[lang].delete}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Challenge löschen?</AlertDialogTitle>
                    <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t[lang].cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteChallenge()}>{t[lang].delete}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardTitle>
          <CardDescription>
            {format(new Date(challenge.start_date as any), 'PPP')} – {format(new Date(challenge.end_date as any), 'PPP')}
            {isKPIChallenge && kpiDefinition ? (
              <span> · Ziel: {kpiDefinition.target_value} {kpiDefinition.unit}</span>
            ) : (
              <span> · €{penalty.toFixed(2)} per violation</span>
            )}
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

          {/* Charts/Data Section - Different for KPI vs Habit */}
          {isKPIChallenge && kpiDefinition ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="monitoring">KPI Monitoring</TabsTrigger>
                <TabsTrigger value="violations">Verstöße</TabsTrigger>
                <TabsTrigger value="cumulative">Kumulierte Strafen</TabsTrigger>
              </TabsList>

              <TabsContent value="monitoring">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">KPI Monitoring</h3>
                    <Button 
                      onClick={() => setKpiDataOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t[lang].addKPIData}
                    </Button>
                  </div>
                  
                  <KPIDetailChart 
                    challengeId={challenge.id}
                    kpiDefinition={kpiDefinition}
                    userId={currentUserId || ""}
                  />
                </div>
              </TabsContent>

              <TabsContent value="violations">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Verstöße je Teilnehmer:in</h3>
                    <Button 
                      onClick={() => setViolationOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Manueller Verstoß
                    </Button>
                  </div>
                  <ViolationsPerParticipant 
                    challengeId={challenge.id} 
                    participants={rows.map(r => ({ user_id: r.user_id, name: r.name }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="cumulative">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Kumulierte Strafen über Zeit</div>
                  <CumulativePenaltyChart challengeId={challenge.id} participants={rows.map(r => ({ user_id: r.user_id, name: r.name }))} />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Original Habit Challenge Charts */
            <Tabs defaultValue="violations" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="violations">Verstöße</TabsTrigger>
                <TabsTrigger value="cumulative">Kumulierte Strafen</TabsTrigger>
              </TabsList>

              <TabsContent value="violations">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Verstöße je Teilnehmer:in</div>
                  <ChartContainer
                    config={Object.fromEntries(rows.map(r => [r.name, { label: r.name, color: colorMap[r.user_id] }]))}
                    className="w-full h-56 md:h-64"
                    withAspect={false}
                  >
                    <Recharts.BarChart data={chartData}>
                      <Recharts.CartesianGrid strokeDasharray="3 3" />
                      <Recharts.XAxis dataKey="name" />
                      <Recharts.YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Recharts.Bar dataKey="count" name="Verstöße" radius={[4,4,0,0]}>
                        {chartData.map((entry, index) => (
                          <Recharts.Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Recharts.Bar>
                    </Recharts.BarChart>
                  </ChartContainer>
                </div>
              </TabsContent>

              <TabsContent value="cumulative">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Kumulierte Strafen nach Zeitraum</div>
                  <CumulativePenaltyChart
                    challengeId={id!}
                    participants={rows.map(r => ({ user_id: r.user_id, name: r.name }))}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Actions per participant - Different for KPI vs Habit */}
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
                    {isKPIChallenge ? (
                      <div className="text-sm text-muted-foreground">
                        KPI Teilnehmer - Daten über "KPI Daten eingeben" Button oben
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {r.penalty_count} × €{penalty.toFixed(2)} = €{(r.penalty_count * penalty).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                {!isKPIChallenge && (
                  <Button 
                    size="sm" 
                    onClick={() => { 
                      setSelectedRow(r); 
                      setViolationOpen(true); 
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> {t[lang].addViolation}
                  </Button>
                )}
              </div>
            ))}
          </div>

        </CardContent>
      </Card>


      {/* KPI Data Entry Dialog - Only for KPI Challenges */}
      {isKPIChallenge && kpiDefinition && (
        <Dialog open={kpiDataOpen} onOpenChange={setKpiDataOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>KPI Daten eingeben</DialogTitle>
            </DialogHeader>
            <KPIDataEntry 
              challenge={{
                id: challenge.id,
                title: challenge.title,
                kpi_definitions: [kpiDefinition]
              }}
              onSuccess={() => {
                setKpiDataOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Violation Entry Dialog - For both Habit and KPI Challenges */}
      <ViolationEntryDialog
        open={violationOpen}
        onOpenChange={(open) => {
          setViolationOpen(open);
          if (!open) setSelectedRow(null);
        }}
        onAddViolation={addViolation}
        selectedRow={selectedRow}
      />

      <AddParticipantsDialog open={addOpen} onOpenChange={setAddOpen} challengeId={id!} onAdded={() => refetchCps()} />
    </section>
  );
}
