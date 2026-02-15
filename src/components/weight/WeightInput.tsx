import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scale, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeightEntry } from '@/lib/weight/types';

interface Props {
  lastEntry: WeightEntry | null;
  onSave: (data: { date: string; time: string; weight_kg: number }) => Promise<void>;
  isSaving: boolean;
}

export default function WeightInput({ lastEntry, onSave, isSaving }: Props) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  const [weight, setWeight] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    const val = parseFloat(weight.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    await onSave({ date: todayStr, time: timeStr, weight_kg: val });
    setSaved(true);
    setTimeout(() => { setSaved(false); setWeight(''); }, 1500);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Gewicht eintragen</h3>
          <p className="text-xs text-muted-foreground">
            {todayStr} · {timeStr} Uhr
          </p>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Input
            type="text"
            inputMode="decimal"
            placeholder={lastEntry ? `${lastEntry.weight_kg} kg` : '0.0 kg'}
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="text-2xl font-bold h-14 pr-10 bg-background"
            disabled={isSaving}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
            kg
          </span>
        </div>
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center justify-center w-14 h-14 rounded-xl bg-green-500/20"
            >
              <Check className="h-6 w-6 text-green-500" />
            </motion.div>
          ) : (
            <motion.div key="btn" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || !weight}
                className="h-14 px-6 text-base font-semibold"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Speichern'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
