import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Group { id: string; name: string; description: string | null; invite_code: string; owner_id: string; }

const GroupsPage = () => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

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
              <div className="text-sm text-muted-foreground">Invite code: <code>{g.invite_code}</code></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default GroupsPage;
