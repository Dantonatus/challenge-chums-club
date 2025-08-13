import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupSelect } from '@/components/GroupSelect';
import ChallengeHistoryDialog from '@/components/challenges/ChallengeHistoryDialog';
import { ChallengeTypeToggle } from '@/components/challenges/ChallengeTypeToggle';
import { KPIChallengeForm } from '@/components/challenges/KPIChallengeForm';
import { KPIDataEntry } from '@/components/challenges/KPIDataEntry';
import { Target, Plus } from 'lucide-react';

interface Challenge { 
  id: string; 
  title: string; 
  description: string | null; 
  penalty_cents: number; 
  strike_allowance: number; 
  group_id: string; 
  created_by: string; 
  challenge_type: 'habit' | 'kpi';
  kpi_definitions?: Array<{
    id: string;
    kpi_type: string;
    target_value: number;
    unit: string;
    measurement_frequency: string;
    aggregation_method: string;
  }>;
}

const today = () => new Date().toISOString().slice(0, 10);

const ChallengesPage = () => {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeType, setChallengeType] = useState<'habit' | 'kpi'>('habit');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [penalty, setPenalty] = useState(1); // dollars
  const [strikes, setStrikes] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [myParticipation, setMyParticipation] = useState<Record<string, boolean>>({});
  const [todaysLogs, setTodaysLogs] = useState<Record<string, boolean>>({});
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedKPIChallenge, setSelectedKPIChallenge] = useState<(Challenge & { kpi_definitions: any[] }) | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!groupId) return;
      const { data } = await supabase
        .from('challenges')
        .select(`
          *,
          kpi_definitions (
            id,
            kpi_type,
            target_value,
            unit,
            measurement_frequency,
            aggregation_method
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      setChallenges(data || []);
      if (userId) {
        const ids = (data || []).map(c => c.id);
        const parts: Record<string, boolean> = {};
        for (const id of ids) {
          const { data: p } = await supabase.from('challenge_participants').select('id').eq('challenge_id', id).eq('user_id', userId).maybeSingle();
          parts[id] = !!p;
        }
        setMyParticipation(parts);
        const logs: Record<string, boolean> = {};
        for (const id of ids) {
          const { data: l } = await supabase.from('logs').select('success').eq('challenge_id', id).eq('user_id', userId).eq('date', today()).maybeSingle();
          logs[id] = !!l?.success;
        }
        setTodaysLogs(logs);
      }
    };
    fetchData();
  }, [groupId, userId]);

  const createChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !userId) return;
    const { data, error } = await supabase.from('challenges').insert({
      group_id: groupId,
      title,
      description: desc || null,
      penalty_cents: Math.round(penalty * 100),
      strike_allowance: strikes,
      created_by: userId,
      challenge_type: 'habit',
    }).select('*').maybeSingle();
    if (error) return toast({ title: 'Failed to create challenge', description: error.message, variant: 'destructive' as any });
    if (data) {
      await supabase.from('challenge_participants').insert({ challenge_id: data.id, user_id: userId });
    }
    setTitle(''); setDesc(''); setPenalty(1); setStrikes(0);
    toast({ title: 'Challenge created' });
    refreshChallenges();
  };

  const refreshChallenges = async () => {
    if (!groupId) return;
    const { data: list } = await supabase
      .from('challenges')
      .select(`
        *,
        kpi_definitions (
          id,
          kpi_type,
          target_value,
          unit,
          measurement_frequency,
          aggregation_method
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    setChallenges(list || []);
  };

  const toggleToday = async (challengeId: string) => {
    if (!userId) return;
    try {
      const existing = todaysLogs[challengeId] ?? false;
      const { data: current } = await supabase.from('logs').select('id, success').eq('challenge_id', challengeId).eq('user_id', userId).eq('date', today()).maybeSingle();
      if (current) {
        await supabase.from('logs').update({ success: !current.success }).eq('id', current.id);
      } else {
        await supabase.from('logs').insert({ challenge_id: challengeId, user_id: userId, date: today(), success: true });
      }
      setTodaysLogs(prev => ({ ...prev, [challengeId]: !existing }));
    } catch (err: any) {
      toast({ title: 'Could not log', description: err.message, variant: 'destructive' as any });
    }
  };

  const canLog = (cid: string) => !!myParticipation[cid];

  // Filter challenges by selected type
  const filteredChallenges = challenges.filter(c => c.challenge_type === challengeType);

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
    <section>
      <Helmet>
        <title>Challenges | Character Challenge</title>
        <meta name="description" content="Create challenges and log your daily or weekly progress." />
        <link rel="canonical" href="/app/challenges" />
      </Helmet>

      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Challenges</h1>
        <GroupSelect value={groupId} onChange={setGroupId} />
      </div>

      {/* Challenge Type Toggle */}
      <div className="mb-6">
        <ChallengeTypeToggle value={challengeType} onValueChange={setChallengeType} />
      </div>

      {/* Create Challenge Section */}
      <div className="mb-6">
        {challengeType === 'habit' ? (
          <Card>
            <CardHeader>
              <CardTitle>Neue Habit Challenge</CardTitle>
              <CardDescription>Strafe und Verwarnungen festlegen. Du wirst automatisch als Teilnehmer hinzugefügt.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createChallenge} className="grid md:grid-cols-4 gap-3">
                <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <Input placeholder="Beschreibung (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <Input type="number" min={0} step="0.5" placeholder="Strafe (€)" value={penalty} onChange={(e) => setPenalty(parseFloat(e.target.value || '0'))} />
                <Input type="number" min={0} step="1" placeholder="Verwarnungen" value={strikes} onChange={(e) => setStrikes(parseInt(e.target.value || '0'))} />
                <Button type="submit" className="md:col-span-4">Challenge erstellen</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Neue KPI Challenge erstellen</h3>
                  <p className="text-muted-foreground text-center">
                    Erstelle eine datengetriebene Challenge mit messbaren Zielen
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>KPI Challenge erstellen</DialogTitle>
              </DialogHeader>
              {groupId && (
                <KPIChallengeForm 
                  groupId={groupId} 
                  onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    refreshChallenges();
                  }} 
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Challenges List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredChallenges.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Keine {challengeType === 'habit' ? 'Habit' : 'KPI'} Challenges gefunden
            </h3>
            <p className="text-muted-foreground">
              {challengeType === 'habit' 
                ? 'Erstelle deine erste Habit Challenge um mit täglichen Gewohnheiten zu starten.'
                : 'Erstelle deine erste KPI Challenge um messbare Ziele zu verfolgen.'
              }
            </p>
          </div>
        ) : (
          filteredChallenges.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {c.challenge_type === 'kpi' && c.kpi_definitions?.[0] && (
                    <span className="text-xl">{getKPIIcon(c.kpi_definitions[0].kpi_type)}</span>
                  )}
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {c.title}
                      {c.challenge_type === 'kpi' && (
                        <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                          KPI
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{c.description}</CardDescription>
                    {c.challenge_type === 'kpi' && c.kpi_definitions?.[0] && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Ziel: {c.kpi_definitions[0].target_value} {c.kpi_definitions[0].unit}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {c.challenge_type === 'habit' ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id={`chk-${c.id}`} 
                        checked={!!todaysLogs[c.id]} 
                        disabled={!canLog(c.id)} 
                        onCheckedChange={() => toggleToday(c.id)} 
                      />
                      <label htmlFor={`chk-${c.id}`} className="text-sm text-muted-foreground">
                        Heute als Erfolg markieren
                      </label>
                      {!canLog(c.id) && (
                        <span className="text-xs text-muted-foreground">
                          (Ersteller um Teilnahme bitten)
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setHistoryId(c.id)}>
                      Verlauf & Fortschritt
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (c.kpi_definitions && c.kpi_definitions.length > 0) {
                          setSelectedKPIChallenge(c as Challenge & { kpi_definitions: any[] });
                        }
                      }}
                      disabled={!canLog(c.id) || !c.kpi_definitions?.length}
                    >
                      Daten eingeben
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setHistoryId(c.id)}>
                      Verlauf & Fortschritt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      {historyId && userId && (
        <ChallengeHistoryDialog
          open={!!historyId}
          onOpenChange={(o) => { if (!o) setHistoryId(null); }}
          challengeId={historyId}
          title={challenges.find((x) => x.id === historyId)?.title || 'Challenge'}
          canLog={canLog(historyId)}
          userId={userId}
        />
      )}

      {/* KPI Data Entry Dialog */}
      {selectedKPIChallenge && (
        <Dialog 
          open={!!selectedKPIChallenge} 
          onOpenChange={(open) => { if (!open) setSelectedKPIChallenge(null); }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>KPI Daten eingeben</DialogTitle>
            </DialogHeader>
            <KPIDataEntry 
              challenge={selectedKPIChallenge}
              onSuccess={() => {
                setSelectedKPIChallenge(null);
                refreshChallenges();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};

export default ChallengesPage;
