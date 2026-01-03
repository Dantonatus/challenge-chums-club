import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGenerateRecipe } from '@/hooks/useRecipes';
import { 
  CUISINE_OPTIONS, 
  ALLERGY_OPTIONS, 
  GOAL_LABELS,
  type GenerateRecipeInput,
  type GeneratedRecipe 
} from '@/lib/recipes/types';
import { cn } from '@/lib/utils';

export default function RecipesCreate() {
  const navigate = useNavigate();
  const generateRecipe = useGenerateRecipe();

  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<GenerateRecipeInput['goal']>();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState<string>();
  const [timeLimit, setTimeLimit] = useState<number>();

  const handleAllergyToggle = (allergy: string) => {
    setAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    const recipe = await generateRecipe.mutateAsync({
      description,
      goal,
      allergies: allergies.length ? allergies : undefined,
      cuisine,
      time_limit: timeLimit,
    });

    // Navigate to review page with recipe data
    navigate('/app/recipes/review', { state: { recipe } });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">AI Recipe Generator</h1>
        <p className="mt-1 text-muted-foreground">
          Describe what you want to eat and I'll create a recipe with nutrition info
        </p>
      </div>

      {/* Main input */}
      <div className="space-y-2">
        <Label htmlFor="description">Describe your meal</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., A high-protein chicken stir-fry with lots of vegetables, Asian-inspired flavors..."
          className="min-h-32 resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Be specific about ingredients, flavors, or dietary goals for better results
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Dietary Goal (optional)</Label>
          <Select value={goal || ''} onValueChange={(v) => setGoal(v as any || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="Select goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No specific goal</SelectItem>
              {Object.entries(GOAL_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cuisine Style (optional)</Label>
          <Select value={cuisine || ''} onValueChange={(v) => setCuisine(v || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="Any cuisine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any cuisine</SelectItem>
              {CUISINE_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Time Limit (optional)</Label>
          <Select 
            value={timeLimit?.toString() || ''} 
            onValueChange={(v) => setTimeLimit(v ? parseInt(v) : undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No limit</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Allergies */}
      <div className="space-y-2">
        <Label>Allergies & Restrictions</Label>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((allergy) => (
            <Badge
              key={allergy}
              variant={allergies.includes(allergy) ? 'destructive' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => handleAllergyToggle(allergy)}
            >
              {allergy}
            </Badge>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={!description.trim() || generateRecipe.isPending}
      >
        {generateRecipe.isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating recipe...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Recipe
          </>
        )}
      </Button>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          The AI will estimate nutrition values based on typical ingredient data. 
          You can review and adjust the recipe before saving.
        </p>
      </div>
    </div>
  );
}
