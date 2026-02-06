import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, Sparkles } from 'lucide-react';

interface PlanningEmptyStateProps {
  onAddClick: () => void;
}

export function PlanningEmptyState({ onAddClick }: PlanningEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <CalendarDays className="h-10 w-10 text-primary" />
      </div>

      <h2 className="text-2xl font-bold mb-2">Deine Projektübersicht</h2>
      
      <p className="text-muted-foreground max-w-md mb-8">
        Behalte alle wichtigen Meilensteine im Blick. 
        Verträge, Kick-Offs, Deadlines – alles auf einen Blick.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onAddClick} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Meilenstein hinzufügen
        </Button>
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        <QuickExample 
          icon="📝" 
          title="Vertragsschluss" 
          example="13.01.26 Sensoplast"
        />
        <QuickExample 
          icon="🚀" 
          title="Kick-Off Meeting" 
          example="24.02.26 Acme Corp"
        />
        <QuickExample 
          icon="⏰" 
          title="Deadline" 
          example="17.04.26 Projekt X"
        />
      </div>
    </div>
  );
}

function QuickExample({ icon, title, example }: { icon: string; title: string; example: string }) {
  return (
    <div className="p-4 rounded-xl border bg-card/50 text-left">
      <span className="text-2xl mb-2 block">{icon}</span>
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{example}</p>
    </div>
  );
}
