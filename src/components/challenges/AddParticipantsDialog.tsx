import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    search: "Gruppenmitglieder suchen",
    empty: "Keine Gruppenmitglieder gefunden.",
    cancel: "Abbrechen",
    add: "Hinzufügen",
  },
  en: {
    title: "Add participants",
    search: "Search group members",
    empty: "No group members found.",
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
    const loadMembers = async () => {
      if (!open) return;
      try {
        // 1) Resolve challenge -> group
        const { data: ch } = await (supabase as any)
          .from('challenges')
          .select('id, group_id')
          .eq('id', challengeId)
          .maybeSingle();
        const gid = ch?.group_id as string | undefined;
        if (!gid) { setFriends([]); return; }

        // 2) Fetch group members and their profiles
        const { data: gm } = await (supabase as any)
          .from('group_members')
          .select('user_id')
          .eq('group_id', gid);
        const memberIds = (gm || []).map((r: any) => r.user_id);

        // 3) Ensure current user is known
        if (!userId) {
          const { data: u } = await supabase.auth.getUser();
          setUserId(u.user?.id ?? null);
        }

        // 4) Load profiles for names
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('id, display_name')
          .in('id', memberIds);

        // 5) Already participating -> keep to avoid duplicate inserts
        const { data: existing } = await (supabase as any)
          .from('challenge_participants')
          .select('user_id')
          .eq('challenge_id', challengeId);
        const existingSet = new Set((existing || []).map((r: any) => r.user_id));

        const list = (profs || []).map((p: any) => ({ id: p.id, display_name: p.display_name }));
        setFriends(list);

        // Auto-select all members (user can uncheck)
        const initSel: Record<string, boolean> = {};
        for (const id of memberIds) initSel[id] = true;
        setSelected(initSel);

        // Save existing for filtering on submit
        (window as any).__cp_existing = existingSet; // lightweight local cache
      } catch {
        setFriends([]);
      }
    };
    loadMembers();
  }, [open, challengeId]);

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const addSelected = async () => {
    try {
      const existingSet: Set<string> | undefined = (window as any).__cp_existing;
      const chosen = Object.entries(selected).filter(([, v]) => v).map(([id]) => id);
      const toInsert = chosen
        .filter((uid) => !(existingSet?.has(uid)))
        .map((uid) => ({ challenge_id: challengeId, user_id: uid }));

      if (toInsert.length === 0) { onOpenChange(false); return; }
      const { error } = await supabase.from('challenge_participants').insert(toInsert);
      if (error) throw error;
      toast({ title: tt[lang].add });
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
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{tt[lang].title}</DialogTitle>
          <DialogDescription>Wähle Gruppenmitglieder aus, um sie zur Challenge hinzuzufügen.</DialogDescription>
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
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(Object.fromEntries(friends.map(f => [f.id, true])))}>Alle auswählen</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{tt[lang].cancel}</Button>
              <Button onClick={addSelected}>{tt[lang].add}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
