import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupSelect } from '@/components/GroupSelect';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Payment { id: string; user_id: string; amount_cents: number; type: 'paid'|'owed'|'adjustment'; note: string | null; created_at: string; }

const LedgerPage = () => {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [targetUser, setTargetUser] = useState('');
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const fetchPayments = async () => {
    if (!groupId || !userId) return;
    
    // With the new security policy, users can only see their own payments
    // Group owners can no longer see all group payments for privacy protection
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId) // Only fetch current user's payments
      .order('created_at', { ascending: false });
    
    setPayments(data || []);
    
    // Check if user is group owner (for showing owner actions)
    const { data: owner } = await supabase.rpc('is_group_owner', { _group_id: groupId });
    setIsOwner(!!owner);
  };
  useEffect(() => { fetchPayments(); }, [groupId, userId]);

  const addPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !userId) return;
    const { error } = await supabase.from('payments').insert({ group_id: groupId, user_id: userId, amount_cents: Math.round(amount * 100), type: 'paid', note: note || null });
    if (error) return toast({ title: 'Failed to add payment', description: error.message, variant: 'destructive' as any });
    setAmount(0); setNote('');
    fetchPayments();
  };

  const addOwedOrAdjustment = async (type: 'owed'|'adjustment') => {
    if (!groupId || !targetUser) return;
    const dateStr = (entryDate ?? new Date()).toISOString().slice(0, 10);
    const { error } = await supabase.from('payments').insert({ group_id: groupId, user_id: targetUser, amount_cents: Math.round(amount * 100), type, note: note || null, period_start: dateStr });
    if (error) return toast({ title: 'Failed to record', description: error.message, variant: 'destructive' as any });
    setAmount(0); setNote(''); setTargetUser('');
    fetchPayments();
  };

  return (
    <section>
      <Helmet>
        <title>Ledger | Character Challenge</title>
        <meta name="description" content="Track payments and adjustments for your challenge group." />
        <link rel="canonical" href="/app/ledger" />
      </Helmet>

      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Ledger</h1>
        <GroupSelect value={groupId} onChange={setGroupId} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add a payment (you)</CardTitle>
          <CardDescription>Record a payment you made toward your balance.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addPaid} className="grid md:grid-cols-3 gap-3">
            <Input type="number" step="0.5" min={0} placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value || '0'))} />
            <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit">Add payment</Button>
          </form>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Owner actions</CardTitle>
            <CardDescription>Record owed amounts or adjustments for members.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("justify-start text-left font-normal", !entryDate && "text-muted-foreground")}
                    aria-label="Datum auswählen"
                  >
                    {entryDate ? format(entryDate, "PPP") : <span>Datum wählen</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={entryDate}
                    onSelect={setEntryDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Input placeholder="Target user id" value={targetUser} onChange={(e) => setTargetUser(e.target.value)} />
              <Input type="number" step="0.5" min={0} placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value || '0'))} />
              <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => addOwedOrAdjustment('owed')}>Record owed</Button>
                <Button variant="outline" onClick={() => addOwedOrAdjustment('adjustment')}>Adjustment</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Payment History</CardTitle>
          <CardDescription>View your personal payment records (enhanced privacy protection)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment records found for this group.</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {p.type === 'paid' ? '💰 Payment Made' : p.type === 'owed' ? '📝 Amount Owed' : '⚖️ Adjustment'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()} at {new Date(p.created_at).toLocaleTimeString()}
                    </span>
                    {p.note && <span className="text-xs text-muted-foreground mt-1">Note: {p.note}</span>}
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${p.type === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                      ${(p.amount_cents/100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default LedgerPage;
