import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Group { id: string; name: string; description: string | null; invite_code: string; owner_id: string; }

const GroupsPage = () => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, { user_id: string; name: string; avatar_url?: string }[]>>({});
  const [manageOpen, setManageOpen] = useState<{ open: boolean; groupId: string | null }>({ open: false, groupId: null });

  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    setGroups(data || []);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    fetchGroups();
  }, []);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const { data, error } = await supabase.from('groups').insert({ name, description: description || null, owner_id: userId }).select('*').maybeSingle();
    if (error) return toast({ title: 'Failed to create group', description: error.message, variant: 'destructive' as any });
    // Add owner as member
    if (data) {
      await supabase.from('group_members').insert({ group_id: data.id, user_id: userId });
    }
    setName(''); setDescription('');
    toast({ title: 'Group created' });
    fetchGroups();
  };

  const loadMembers = async (gid: string) => {
    const { data: gm } = await (supabase as any)
      .from('group_members')
      .select('user_id')
      .eq('group_id', gid);
    const ids = (gm || []).map((r: any) => r.user_id);
    if (ids.length === 0) { setMembers(prev => ({ ...prev, [gid]: [] })); return; }
    const { data: profs } = await (supabase as any)
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);
    const list = ids.map((id: string) => {
      const p = (profs || []).find((x: any) => x.id === id);
      return { user_id: id, name: p?.display_name || id.slice(0,6), avatar_url: p?.avatar_url };
    });
    setMembers(prev => ({ ...prev, [gid]: list }));
  };

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.rpc('join_group', { p_invite_code: inviteCode.trim() });
    if (error) return toast({ title: 'Join failed', description: error.message, variant: 'destructive' as any });
    setInviteCode('');
    toast({ title: 'Joined group' });
    fetchGroups();
  };

  return (
    <section>
      <Helmet>
        <title>Groups | Character Challenge</title>
        <meta name="description" content="Browse, create, and join groups to start challenges." />
        <link rel="canonical" href="/app/groups" />
      </Helmet>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create a group</CardTitle>
            <CardDescription>Name and describe your accountability group.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createGroup} className="space-y-3">
              <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Join with invite code</CardTitle>
            <CardDescription>Paste an invite code to become a member.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinByCode} className="space-y-3">
              <Input placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
              <Button type="submit">Join group</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardHeader>
              <CardTitle>{g.name}</CardTitle>
              <CardDescription>{g.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Only show invite code to group owners for security */}
              {g.owner_id === userId && (
                <div className="text-sm text-muted-foreground mb-3">
                  Invite code: <code className="bg-muted px-2 py-1 rounded font-mono">{g.invite_code}</code>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  await loadMembers(g.id);
                  setManageOpen({ open: true, groupId: g.id });
                }}>Mitglieder verwalten</Button>
                {/* Only show copy invite code button to group owners */}
                {g.owner_id === userId && (
                  <Button size="sm" variant="secondary" onClick={() => {
                    navigator.clipboard.writeText(g.invite_code);
                    toast({ title: 'Invite code kopiert' });
                  }}>Code kopieren</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={manageOpen.open} onOpenChange={(o) => setManageOpen({ open: o, groupId: o ? manageOpen.groupId : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mitglieder verwalten</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(members[manageOpen.groupId || ''] || []).map((m) => (
              <div key={m.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatar_url} alt={m.name} />
                    <AvatarFallback>{m.name.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{m.name}</span>
                </div>
                <div>
                  {groups.find(g => g.id === manageOpen.groupId)?.owner_id === userId ? (
                    <Button size="sm" variant="destructive" onClick={async () => {
                      const gid = manageOpen.groupId!;
                      const { error } = await (supabase as any).from('group_members').delete().eq('group_id', gid).eq('user_id', m.user_id);
                      if (error) return toast({ title: 'Fehler', description: error.message, variant: 'destructive' as any });
                      await loadMembers(gid);
                      toast({ title: 'Mitglied entfernt' });
                    }}>Entfernen</Button>
                  ) : m.user_id === userId ? (
                    <Button size="sm" variant="outline" onClick={async () => {
                      const gid = manageOpen.groupId!;
                      const { error } = await (supabase as any).from('group_members').delete().eq('group_id', gid).eq('user_id', m.user_id);
                      if (error) return toast({ title: 'Fehler', description: error.message, variant: 'destructive' as any });
                      setManageOpen({ open: false, groupId: null });
                      fetchGroups();
                      toast({ title: 'Gruppe verlassen' });
                    }}>Verlassen</Button>
                  ) : null}
                </div>
              </div>
            ))}
            {(members[manageOpen.groupId || ''] || []).length === 0 && (
              <div className="text-sm text-muted-foreground">Keine Mitglieder gefunden.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default GroupsPage;
