import { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecipeStep } from '@/lib/recipes/types';

interface StepsListProps {
  steps: RecipeStep[];
  cookMode?: boolean;
  className?: string;
}

export function StepsList({ steps, cookMode = false, className }: StepsListProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState(0);

  const toggleStep = (step: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(step)) {
      newCompleted.delete(step);
    } else {
      newCompleted.add(step);
      // Auto-advance to next step
      if (step === activeStep && step < steps.length - 1) {
        setActiveStep(step + 1);
      }
    }
    setCompletedSteps(newCompleted);
  };

  if (cookMode) {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = completedSteps.has(index);

          return (
            <button
              key={index}
              onClick={() => {
                setActiveStep(index);
                toggleStep(index);
              }}
              className={cn(
                'w-full rounded-2xl border p-6 text-left transition-all',
                isActive && !isCompleted && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                isCompleted && 'border-green-500/30 bg-green-500/5',
                !isActive && !isCompleted && 'border-border bg-card opacity-60'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold transition-all',
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.step}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-base',
                      isCompleted && 'line-through text-muted-foreground'
                    )}
                  >
                    {step.instruction}
                  </p>
                  {step.time_minutes && (
                    <span className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {step.time_minutes} min
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border bg-card p-5', className)}>
      <h3 className="mb-4 font-semibold">Instructions</h3>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {step.step}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm text-foreground">{step.instruction}</p>
              {step.time_minutes && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {step.time_minutes} min
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
