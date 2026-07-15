import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { useHealthGoal, type HealthGoal, type HealthGoalMode } from '@/hooks/useHealthGoal';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: HealthGoal | null;
}

const MODES: { value: HealthGoalMode; label: string; desc: string }[] = [
  { value: 'weight_loss', label: 'Abnehmen', desc: 'Fokus auf negative Energiebilanz.' },
  { value: 'weight_gain', label: 'Aufbauen', desc: 'Positive Energiebilanz, Muskel priorisiert.' },
  { value: 'maintain', label: 'Halten', desc: 'Aktuelles Niveau stabilisieren.' },
  { value: 'recomposition', label: 'Recomposition', desc: 'Fett runter, Muskel rauf.' },
  { value: 'training_consistency', label: 'Trainings-Konstanz', desc: 'Fokus auf regelmäßiges Training.' },
];

export function GoalEditorSheet({ open, onOpenChange, goal }: Props) {
  const { save, clear } = useHealthGoal();
  const [mode, setMode] = useState<HealthGoalMode>('recomposition');
  const [weight, setWeight] = useState('');
  const [bf, setBf] = useState('');
  const [weekly, setWeekly] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (open) {
      setMode(goal?.goal_mode ?? 'recomposition');
      setWeight(goal?.target_weight_kg?.toString() ?? '');
      setBf(goal?.target_body_fat_percent?.toString() ?? '');
      setWeekly(goal?.weekly_training_target?.toString() ?? '');
      setDate(goal?.target_date ?? '');
    }
  }, [open, goal]);

  const submit = async () => {
    try {
      await save.mutateAsync({
        goal_mode: mode,
        target_weight_kg: weight ? Number(weight.replace(',', '.')) : null,
        target_body_fat_percent: bf ? Number(bf.replace(',', '.')) : null,
        weekly_training_target: weekly ? parseInt(weekly, 10) : null,
        target_date: date || null,
      });
      toast({ title: 'Ziel gespeichert' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Speichern fehlgeschlagen', description: e?.message, variant: 'destructive' });
    }
  };

  const remove = async () => {
    try {
      await clear.mutateAsync();
      toast({ title: 'Ziel entfernt' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Fehler', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{goal ? 'Ziel bearbeiten' : 'Ziel definieren'}</SheetTitle>
          <SheetDescription>Ohne Ziel bleibt Reporting reine Vergangenheitsanalyse.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-health-ink-subtle">Modus</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as HealthGoalMode)} className="grid gap-2">
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-health-hairline p-3 transition-colors hover:border-health-ink/20 has-[[data-state=checked]]:border-health-ink has-[[data-state=checked]]:bg-health-hairline/20"
                >
                  <RadioGroupItem value={m.value} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-health-ink-muted">{m.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="target-weight" className="text-xs">Zielgewicht (kg)</Label>
              <Input id="target-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="z. B. 82,0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-bf" className="text-xs">Körperfett-Ziel (%)</Label>
              <Input id="target-bf" inputMode="decimal" value={bf} onChange={(e) => setBf(e.target.value)} placeholder="z. B. 15" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-weekly" className="text-xs">Trainings / Woche</Label>
              <Input id="target-weekly" inputMode="numeric" value={weekly} onChange={(e) => setWeekly(e.target.value)} placeholder="z. B. 4" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-date" className="text-xs">Zieldatum</Label>
              <Input id="target-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8 gap-2 sm:justify-between">
          {goal ? (
            <Button variant="ghost" onClick={remove} disabled={clear.isPending} className="text-health-danger hover:text-health-danger">
              Ziel entfernen
            </Button>
          ) : <span />}
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
