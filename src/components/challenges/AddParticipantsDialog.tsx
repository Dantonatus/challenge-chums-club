import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  onAdded?: () => void;
}

const tt = {
  de: {
    title: "Teilnehmer:innen hinzufügen",
    search: "Freunde suchen",
    empty: "Keine Freund:innen gefunden.",
    cancel: "Abbrechen",
    add: "Hinzufügen",
  },
  en: {
    title: "Add participants",
    search: "Search friends",
    empty: "No friends found.",
    cancel: "Cancel",
    add: "Add",
  },
};

export default function AddParticipantsDialog({ open, onOpenChange, challengeId, onAdded }: Props) {
  const lang: keyof typeof tt = 'de';
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<{ id: string; display_name: string | null }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const loadFriends = async () => {
      if (!userId) return;
      // gather friend ids where status = accepted
      const { data, error } = await (supabase as any)
        .from('user_friends')
        .select('user_id, friend_user_id, status')
        .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`)
        .eq('status', 'accepted');
      if (error) return;
      const ids = new Set<string>();
      for (const row of (data || []) as any[]) {
        ids.add(row.user_id === userId ? row.friend_user_id : row.user_id);
      }
      if (ids.size === 0) { setFriends([]); return; }
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, display_name')
        .in('id', Array.from(ids));
      setFriends(((profiles || []) as any[]).map((p: any) => ({ id: p.id, display_name: p.display_name })));
    };
    loadFriends();
  }, [userId, open]);

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const addSelected = async () => {
    try {
      const toAdd = Object.entries(selected).filter(([, v]) => v).map(([id]) => ({ challenge_id: challengeId, user_id: id }));
      if (toAdd.length === 0) { onOpenChange(false); return; }
      const { error } = await supabase.from('challenge_participants').insert(toAdd);
      if (error) throw error;
      toast({ title: 'Participants added' });
      onAdded?.();
      onOpenChange(false);
      setSelected({});
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' as any });
    }
  };

  const filtered = useMemo(() => friends.filter(f => (f.display_name || '').toLowerCase().includes(search.toLowerCase())), [friends, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tt[lang].title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={tt[lang].search} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-64 overflow-auto space-y-2">
            {filtered.map((f) => (
              <label key={f.id} className="flex items-center gap-3 text-sm">
                <Checkbox checked={!!selected[f.id]} onCheckedChange={() => toggle(f.id)} />
                <span>{f.display_name || f.id.slice(0,6)}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">{tt[lang].empty}</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{tt[lang].cancel}</Button>
            <Button onClick={addSelected}>{tt[lang].add}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
