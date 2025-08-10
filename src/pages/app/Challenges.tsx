import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupSelect } from '@/components/GroupSelect';

interface Challenge { id: string; title: string; description: string | null; penalty_cents: number; strike_allowance: number; group_id: string; created_by: string; }

const today = () => new Date().toISOString().slice(0, 10);

const ChallengesPage = () => {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [penalty, setPenalty] = useState(1); // dollars
  const [strikes, setStrikes] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [myParticipation, setMyParticipation] = useState<Record<string, boolean>>({});
  const [todaysLogs, setTodaysLogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!groupId) return;
      const { data } = await supabase.from('challenges').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
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
    }).select('*').maybeSingle();
    if (error) return toast({ title: 'Failed to create challenge', description: error.message, variant: 'destructive' as any });
    if (data) {
      await supabase.from('challenge_participants').insert({ challenge_id: data.id, user_id: userId });
    }
    setTitle(''); setDesc(''); setPenalty(1); setStrikes(0);
    toast({ title: 'Challenge created' });
    // refresh
    const { data: list } = await supabase.from('challenges').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New challenge</CardTitle>
          <CardDescription>Set penalty and strikes. You will be auto-added as participant.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createChallenge} className="grid md:grid-cols-4 gap-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Input type="number" min={0} step="0.5" placeholder="Penalty ($)" value={penalty} onChange={(e) => setPenalty(parseFloat(e.target.value || '0'))} />
            <Input type="number" min={0} step="1" placeholder="Strikes" value={strikes} onChange={(e) => setStrikes(parseInt(e.target.value || '0'))} />
            <Button type="submit" className="md:col-span-4">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {challenges.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.title}</CardTitle>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Checkbox id={`chk-${c.id}`} checked={!!todaysLogs[c.id]} disabled={!canLog(c.id)} onCheckedChange={() => toggleToday(c.id)} />
                <label htmlFor={`chk-${c.id}`} className="text-sm text-muted-foreground">Mark today as success</label>
                {!canLog(c.id) && <span className="text-xs text-muted-foreground">(ask creator to add you)</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ChallengesPage;
