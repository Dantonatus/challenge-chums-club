import { useEffect, useMemo, useState } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface LogEntry {
  id?: string;
  date: string; // yyyy-MM-dd
  success: boolean;
  note?: string | null;
}

interface ChallengeHistoryDialogProps {
  challengeId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canLog: boolean;
  userId: string;
}

const rangeDays = 14;

const ChallengeHistoryDialog = ({ challengeId, title, open, onOpenChange, canLog, userId }: ChallengeHistoryDialogProps) => {
  const { toast } = useToast();
  const [days, setDays] = useState<string[]>([]);
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const start = useMemo(() => subDays(new Date(), rangeDays - 1), []);
  const end = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!open) return;
    const ds = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
    setDays(ds);
    (async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("id, date, success, note")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .gte("date", ds[0])
        .lte("date", ds[ds.length - 1])
        .order("date", { ascending: true });
      if (error) {
        toast({ title: "Failed to load history", description: error.message, variant: "destructive" as any });
        return;
      }
      const map: Record<string, LogEntry> = {};
      (data || []).forEach((l) => {
        map[l.date] = { id: l.id, date: l.date, success: l.success, note: l.note };
      });
      // ensure every day exists in map (default false)
      ds.forEach((d) => {
        if (!map[d]) map[d] = { date: d, success: false };
      });
      setLogs(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, challengeId, userId]);

  const toggleForDate = async (date: string, value: boolean) => {
    if (!canLog) return;
    try {
      const existing = logs[date];
      if (existing?.id) {
        const { error } = await supabase.from("logs").update({ success: value }).eq("id", existing.id);
        if (error) throw error;
        setLogs((prev) => ({ ...prev, [date]: { ...prev[date], success: value } }));
      } else {
        const { data, error } = await supabase
          .from("logs")
          .insert({ challenge_id: challengeId, user_id: userId, date, success: value })
          .select("id")
          .maybeSingle();
        if (error) throw error;
        setLogs((prev) => ({ ...prev, [date]: { ...prev[date], id: data?.id, success: value } }));
      }
    } catch (err: any) {
      toast({ title: "Could not update log", description: err.message, variant: "destructive" as any });
    }
  };

  const beginEditNote = (date: string) => {
    setEditingDate(date);
    setNoteDraft((logs[date]?.note as string) || "");
  };

  const saveNote = async () => {
    if (!editingDate) return;
    try {
      const entry = logs[editingDate];
      if (entry?.id) {
        const { error } = await supabase.from("logs").update({ note: noteDraft || null }).eq("id", entry.id);
        if (error) throw error;
        setLogs((prev) => ({ ...prev, [editingDate]: { ...prev[editingDate], note: noteDraft || null } }));
      } else {
        // create log with note (keep success false by default)
        const { data, error } = await supabase
          .from("logs")
          .insert({ challenge_id: challengeId, user_id: userId, date: editingDate, success: false, note: noteDraft || null })
          .select("id")
          .maybeSingle();
        if (error) throw error;
        setLogs((prev) => ({ ...prev, [editingDate]: { ...prev[editingDate], id: data?.id, note: noteDraft || null } }));
      }
      setEditingDate(null);
      setNoteDraft("");
      toast({ title: "Note saved" });
    } catch (err: any) {
      toast({ title: "Could not save note", description: err.message, variant: "destructive" as any });
    }
  };

  const chartData = days.map((d) => ({
    date: format(new Date(d), "MM/dd"),
    success: logs[d]?.success ? 1 : 0,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title} – History & Progress</DialogTitle>
          <DialogDescription>View and edit your recent logs and notes. Last {rangeDays} days.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg border p-3 bg-card/50">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 4, right: 4, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="text-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="success" stroke="hsl(var(--primary))" fill="url(#areaSuccess)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2">
            {days
              .slice()
              .reverse()
              .map((d) => (
                <div key={d} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Checkbox id={`h-${d}`} disabled={!canLog} checked={!!logs[d]?.success} onCheckedChange={(val) => toggleForDate(d, !!val)} />
                    <label htmlFor={`h-${d}`} className="text-sm text-muted-foreground">
                      {format(new Date(d), "EEE, MMM d")}
                    </label>
                  </div>
                  <div className="flex-1" />
                  <div className="w-[50%] max-w-[420px]">
                    {editingDate === d ? (
                      <div className="space-y-2">
                        <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a note (optional)" rows={2} />
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" onClick={() => setEditingDate(null)}>Cancel</Button>
                          <Button onClick={saveNote}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <div className="text-xs text-muted-foreground line-clamp-1">{logs[d]?.note || "No note"}</div>
                        <Button variant="outline" size="sm" onClick={() => beginEditNote(d)} disabled={!canLog}>
                          Edit note
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeHistoryDialog;
