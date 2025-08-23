import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface Entry { id: string; content: string; created_at: string; }

const JournalPage = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const fetchEntries = async () => {
    const { data } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });
    setEntries(data || []);
  };
  useEffect(() => { fetchEntries(); }, []);

  const addEntry = async () => {
    if (!userId || !content.trim()) return;
    const { error } = await supabase.from('journal_entries').insert({ user_id: userId, content: content.trim() });
    if (error) return toast({ title: 'Failed to save', description: error.message, variant: 'destructive' as any });
    setContent('');
    fetchEntries();
  };

  return (
    <section>
      <Helmet>
        <title>Journal | Character Challenge</title>
        <meta name="description" content="Write daily reflections to reinforce your habits." />
        <link rel="canonical" href="/app/journal" />
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Private Journal</h1>
        <p className="text-sm text-muted-foreground">Your personal reflections - only visible to you</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New entry</CardTitle>
          <CardDescription>Keep it short and honest.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea rows={4} placeholder="Today I..." value={content} onChange={(e) => setContent(e.target.value)} />
            <Button onClick={addEntry}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {entries.map((e) => (
          <Card key={e.id}>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">{new Date(e.created_at).toLocaleString()}</div>
              <div className="whitespace-pre-wrap text-sm">{e.content}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default JournalPage;
