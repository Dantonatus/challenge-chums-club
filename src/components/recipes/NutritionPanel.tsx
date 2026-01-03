import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Macros, Micros } from '@/lib/recipes/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NutritionPanelProps {
  calories: number;
  servings: number;
  macros: Macros;
  micros: Micros;
  confidence: number;
  className?: string;
}

const MACRO_COLORS = {
  protein: 'bg-blue-500',
  carbs: 'bg-amber-500',
  fat: 'bg-red-400',
  fiber: 'bg-green-500',
};

const MICRO_UNITS: Record<keyof Micros, string> = {
  sodium: 'mg',
  potassium: 'mg',
  magnesium: 'mg',
  iron: 'mg',
  calcium: 'mg',
  vitaminC: 'mg',
};

const MICRO_LABELS: Record<keyof Micros, string> = {
  sodium: 'Sodium',
  potassium: 'Potassium',
  magnesium: 'Magnesium',
  iron: 'Iron',
  calcium: 'Calcium',
  vitaminC: 'Vitamin C',
};

export function NutritionPanel({
  calories,
  servings,
  macros,
  micros,
  confidence,
  className,
}: NutritionPanelProps) {
  const perServing = {
    calories: Math.round(calories / servings),
    protein: Math.round(macros.protein / servings),
    carbs: Math.round(macros.carbs / servings),
    fat: Math.round(macros.fat / servings),
    fiber: Math.round(macros.fiber / servings),
  };

  const totalMacroGrams = perServing.protein + perServing.carbs + perServing.fat;

  const confidenceLabel =
    confidence >= 0.85
      ? 'High'
      : confidence >= 0.65
      ? 'Medium'
      : 'Low';

  const confidenceColor =
    confidence >= 0.85
      ? 'text-green-500'
      : confidence >= 0.65
      ? 'text-yellow-500'
      : 'text-red-500';

  return (
    <div className={cn('rounded-2xl border bg-card p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Nutrition per Serving</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className={cn('flex items-center gap-1 text-xs', confidenceColor)}>
              <Info className="h-3.5 w-3.5" />
              {confidenceLabel} confidence
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">
              Nutrition values are AI estimates based on standard ingredient data.
              Actual values may vary.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Calories */}
      <div className="mb-6 text-center">
        <span className="text-4xl font-bold text-foreground">{perServing.calories}</span>
        <span className="ml-1 text-muted-foreground">kcal</span>
      </div>

      {/* Macro bars */}
      <div className="mb-6 space-y-3">
        {(['protein', 'carbs', 'fat', 'fiber'] as const).map((macro) => {
          const value = perServing[macro];
          const percentage = totalMacroGrams > 0 ? (value / totalMacroGrams) * 100 : 0;

          return (
            <div key={macro}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{macro}</span>
                <span className="font-medium">{value}g</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', MACRO_COLORS[macro])}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Micros */}
      <div className="border-t pt-4">
        <h4 className="mb-3 text-sm font-medium text-muted-foreground">Micronutrients</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(Object.keys(micros) as (keyof Micros)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-muted-foreground">{MICRO_LABELS[key]}</span>
              <span className="font-medium">
                {Math.round(micros[key] / servings)}
                {MICRO_UNITS[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Nutrition values are estimates and may vary based on actual ingredients and preparation.
        </p>
      </div>
    </div>
  );
}
