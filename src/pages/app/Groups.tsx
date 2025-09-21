import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import GroupCard from '@/components/groups/GroupCard';
import { useUserGroups, useCurrentUser } from '@/hooks/useGroupManagement';
import { toast } from 'sonner';

const GroupsPage = () => {
  const { toast: toastHook } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const { data: groups = [], refetch: refetchGroups } = useUserGroups();
  const { data: currentUser } = useCurrentUser();

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const { data, error } = await supabase.from('groups').insert({ 
      name, 
      description: description || null, 
      owner_id: currentUser.id 
    }).select('*').maybeSingle();
    
    if (error) {
      toastHook({ title: 'Failed to create group', description: error.message, variant: 'destructive' as any });
      return;
    }
    
    // Add owner as member
    if (data) {
      await supabase.from('group_members').insert({ group_id: data.id, user_id: currentUser.id });
    }
    setName(''); 
    setDescription('');
    toast.success('Gruppe erstellt');
    refetchGroups();
  };

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.rpc('join_group', { p_invite_code: inviteCode.trim() });
    if (error) {
      toastHook({ title: 'Join failed', description: error.message, variant: 'destructive' as any });
      return;
    }
    setInviteCode('');
    toast.success('Gruppe beigetreten');
    refetchGroups();
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

      <div className="grid gap-4 md:grid-cols-2" data-testid="groups-grid">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            canManage={currentUser?.id === group.owner_id}
            currentUserId={currentUser?.id}
          />
        ))}
        {groups.length === 0 && (
          <div className="col-span-2 text-center text-muted-foreground py-8">
            Noch keine Gruppen. Erstellen Sie eine neue Gruppe oder treten Sie einer bestehenden bei.
          </div>
        )}
      </div>
    </section>
  );
};

export default GroupsPage;
