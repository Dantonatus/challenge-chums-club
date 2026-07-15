import { useState } from 'react';
import { Target, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { HealthGoal } from '@/hooks/useHealthGoal';
import { GoalEditorSheet } from './GoalEditorSheet';
import { EmptyInsightState } from './EmptyInsightState';

interface Props {
  goal: HealthGoal | null;
  currentWeight?: number | null;
  currentBodyFat?: number | null;
  weeklyTrainingCount?: number;
  className?: string;
}

const MODE_LABEL: Record<string, string> = {
  weight_loss: 'Abnehmen',
  weight_gain: 'Aufbauen',
  maintain: 'Halten',
  recomposition: 'Recomposition',
  training_consistency: 'Trainings-Konstanz',
};

export function JourneyHero({ goal, currentWeight, currentBodyFat, weeklyTrainingCount, className }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  if (!goal) {
    return (
      <>
        <div className={cn('rounded-3xl border border-health-hairline bg-health-surface p-6 shadow-health-hero sm:p-8', className)}>
          <EmptyInsightState
            icon={<Target className="h-5 w-5" />}
            title="Ziel definieren"
            description="Ohne Ziel bleibt Reporting reine Vergangenheitsanalyse. Ein Ziel macht sichtbar, ob du auf Kurs bist."
            action={
              <Button variant="default" size="sm" onClick={() => setEditOpen(true)}>
                <Target className="mr-2 h-4 w-4" />
                Ziel festlegen
              </Button>
            }
          />
        </div>
        <GoalEditorSheet open={editOpen} onOpenChange={setEditOpen} goal={null} />
      </>
    );
  }

  const progress = computeProgress(goal, currentWeight, currentBodyFat, weeklyTrainingCount);

  return (
    <>
      <section
        className={cn(
          'group relative overflow-hidden rounded-3xl border border-health-hairline bg-health-surface p-6 shadow-health-hero sm:p-8',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-health-ink-subtle">
              Deine Journey
            </div>
            <h3 className="mt-1.5 font-health text-xl font-semibold text-health-ink">{MODE_LABEL[goal.goal_mode]}</h3>
            {progress.headline && (
              <p className="mt-2 max-w-md text-sm leading-relaxed text-health-ink-muted">{progress.headline}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="text-health-ink-muted hover:text-health-ink"
          >
            <PenLine className="mr-1.5 h-3.5 w-3.5" />
            Ziel bearbeiten
          </Button>
        </div>

        {progress.bars.length > 0 && (
          <div className="mt-6 space-y-4">
            {progress.bars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-health-ink-muted">{bar.label}</span>
                  <span className="font-medium tabular-nums text-health-ink">{bar.valueLabel}</span>
                </div>
                <Progress value={bar.percent} className="h-1.5 bg-health-hairline/60" />
              </div>
            ))}
          </div>
        )}

        {goal.target_date && (
          <div className="mt-6 border-t border-health-hairline pt-4 text-xs text-health-ink-muted">
            Zieldatum: <span className="font-medium text-health-ink">{new Date(goal.target_date).toLocaleDateString('de-DE')}</span>
          </div>
        )}
      </section>
      <GoalEditorSheet open={editOpen} onOpenChange={setEditOpen} goal={goal} />
    </>
  );
}

function computeProgress(
  goal: HealthGoal,
  currentWeight?: number | null,
  currentBodyFat?: number | null,
  weeklyTrainingCount?: number,
): { headline: string; bars: { label: string; percent: number; valueLabel: string }[] } {
  const bars: { label: string; percent: number; valueLabel: string }[] = [];
  let headline = 'Halte den Kurs.';

  if (goal.target_weight_kg && currentWeight != null) {
    const diff = currentWeight - goal.target_weight_kg;
    const absDiff = Math.abs(diff);
    const pct = absDiff < 0.1 ? 100 : Math.max(0, Math.min(100, 100 - (absDiff / (Math.abs(goal.target_weight_kg) * 0.15)) * 100));
    bars.push({
      label: `Gewicht → ${goal.target_weight_kg.toLocaleString('de-DE')} kg`,
      percent: pct,
      valueLabel: `${currentWeight.toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`,
    });
    headline =
      absDiff < 0.5
        ? 'Zielgewicht so gut wie erreicht.'
        : `Noch ${absDiff.toFixed(1)} kg ${diff < 0 ? 'zuzulegen' : 'zu reduzieren'}.`;
  }
  if (goal.target_body_fat_percent && currentBodyFat != null) {
    const diff = currentBodyFat - goal.target_body_fat_percent;
    const pct = Math.abs(diff) < 0.1 ? 100 : Math.max(0, Math.min(100, 100 - (Math.abs(diff) / 5) * 100));
    bars.push({
      label: `Körperfett → ${goal.target_body_fat_percent}%`,
      percent: pct,
      valueLabel: `${currentBodyFat.toFixed(1)}%`,
    });
  }
  if (goal.weekly_training_target && weeklyTrainingCount != null) {
    const pct = Math.max(0, Math.min(100, (weeklyTrainingCount / goal.weekly_training_target) * 100));
    bars.push({
      label: `Trainings-Ziel → ${goal.weekly_training_target}/Woche`,
      percent: pct,
      valueLabel: `${weeklyTrainingCount} diese Woche`,
    });
  }

  return { headline, bars };
}
