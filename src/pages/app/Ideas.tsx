import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupSelect } from '@/components/GroupSelect';

interface Idea { id: string; title: string; description: string | null; created_by: string; group_id: string; }

const IdeasPage = () => {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, { id: string; content: string; user_id: string }[]>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchIdeas = async () => {
    if (!groupId) return;
    const { data } = await supabase.from('ideas').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    setIdeas(data || []);
    // votes
    const tally: Record<string, number> = {};
    for (const i of data || []) {
      const { data: v } = await supabase.from('idea_votes').select('value').eq('idea_id', i.id);
      tally[i.id] = (v || []).reduce((a, b) => a + b.value, 0);
      const { data: cs } = await supabase.from('idea_comments').select('id, content, user_id').eq('idea_id', i.id).order('created_at', { ascending: true });
      (comments as any)[i.id] = cs || [];
    }
    setVotes(tally);
    setComments({ ...(comments as any) });
  };

  useEffect(() => { fetchIdeas(); }, [groupId]);

  const createIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !userId) return;
    const { error } = await supabase.from('ideas').insert({ group_id: groupId, title, description: desc || null, created_by: userId });
    if (error) return toast({ title: 'Failed to create idea', description: error.message, variant: 'destructive' as any });
    setTitle(''); setDesc('');
    fetchIdeas();
  };

  const castVote = async (ideaId: string, val: number) => {
    if (!userId) return;
    const { data: existing } = await supabase.from('idea_votes').select('id, value').eq('idea_id', ideaId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('idea_votes').update({ value: val }).eq('id', existing.id);
    } else {
      await supabase.from('idea_votes').insert({ idea_id: ideaId, user_id: userId, value: val });
    }
    fetchIdeas();
  };

  const addComment = async (ideaId: string) => {
    if (!userId) return;
    const content = newComment[ideaId]?.trim();
    if (!content) return;
    const { error } = await supabase.from('idea_comments').insert({ idea_id: ideaId, user_id: userId, content });
    if (error) return toast({ title: 'Comment failed', description: error.message, variant: 'destructive' as any });
    setNewComment(prev => ({ ...prev, [ideaId]: '' }));
    fetchIdeas();
  };

  return (
    <section>
      <Helmet>
        <title>Ideas | Character Challenge</title>
        <meta name="description" content="Propose, discuss, and vote on group challenge ideas." />
        <link rel="canonical" href="/app/ideas" />
      </Helmet>

      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Ideas</h1>
        <GroupSelect value={groupId} onChange={setGroupId} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New idea</CardTitle>
          <CardDescription>Share an idea for your group to consider.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createIdea} className="grid md:grid-cols-3 gap-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Button type="submit">Submit</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {ideas.map((i) => (
          <Card key={i.id}>
            <CardHeader>
              <CardTitle>{i.title}</CardTitle>
              <CardDescription>{i.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Button variant="outline" onClick={() => castVote(i.id, 1)}>Upvote</Button>
                <Button variant="outline" onClick={() => castVote(i.id, -1)}>Downvote</Button>
                <span className="text-sm text-muted-foreground">Score: {votes[i.id] ?? 0}</span>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Comments</div>
                {(comments[i.id] || []).map((c) => (
                  <div key={c.id} className="text-sm text-muted-foreground">{c.content}</div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="Add a comment" value={newComment[i.id] || ''} onChange={(e) => setNewComment(prev => ({ ...prev, [i.id]: e.target.value }))} />
                  <Button variant="secondary" onClick={() => addComment(i.id)}>Post</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default IdeasPage;
