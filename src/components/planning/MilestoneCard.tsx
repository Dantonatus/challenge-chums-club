import { MilestoneWithClient, MILESTONE_TYPE_CONFIG } from '@/lib/planning/types';
import { cn } from '@/lib/utils';
import { format, isToday, isPast } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  FileSignature, 
  Rocket, 
  AlertTriangle, 
  Users, 
  Package, 
  CreditCard, 
  Circle,
  MapPin,
  Check
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileSignature,
  Rocket,
  AlertTriangle,
  Users,
  Package,
  CreditCard,
  Circle,
};

interface MilestoneCardProps {
  milestone: MilestoneWithClient;
  onClick: () => void;
  compact?: boolean;
}

export function MilestoneCard({ milestone, onClick, compact = false }: MilestoneCardProps) {
  const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type];
  const IconComponent = ICON_MAP[config.icon] || Circle;
  const milestoneDate = new Date(milestone.date);
  const isOverdue = isPast(milestoneDate) && !isToday(milestoneDate) && !milestone.is_completed;
  const isTodayMilestone = isToday(milestoneDate);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left p-2 rounded-lg border transition-all hover:shadow-md hover:scale-[1.02]",
          "bg-card hover:bg-accent/50",
          milestone.is_completed && "opacity-60 line-through",
          isOverdue && "border-destructive/50 bg-destructive/5",
          isTodayMilestone && "ring-2 ring-primary ring-offset-1"
        )}
      >
        <div className="flex items-start gap-2">
          <span 
            className="font-bold text-lg leading-none"
            style={{ color: isOverdue ? 'hsl(var(--destructive))' : undefined }}
          >
            {format(milestoneDate, 'd')}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <IconComponent 
                className="h-3 w-3 shrink-0" 
                style={{ color: config.color }} 
              />
              <span className="text-sm font-medium truncate">
                {milestone.title}
              </span>
              {milestone.is_completed && (
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
            </div>
            {milestone.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-2.5 w-2.5" />
                <span className="truncate">{milestone.location}</span>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all hover:shadow-lg hover:scale-[1.01]",
        "bg-card",
        milestone.is_completed && "opacity-60",
        isOverdue && "border-destructive/50 bg-destructive/5",
        isTodayMilestone && "ring-2 ring-primary"
      )}
      style={{ borderLeftColor: milestone.client?.color, borderLeftWidth: '4px' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <IconComponent 
              className="h-4 w-4 shrink-0" 
              style={{ color: config.color }} 
            />
            <span className={cn(
              "font-semibold",
              milestone.is_completed && "line-through"
            )}>
              {milestone.title}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {format(milestoneDate, 'EEEE, d. MMMM yyyy', { locale: de })}
            {milestone.time && `, ${milestone.time.slice(0, 5)} Uhr`}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${milestone.client?.color}20`,
                color: milestone.client?.color 
              }}
            >
              {milestone.client?.name}
            </span>
            {milestone.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {milestone.location}
              </span>
            )}
          </div>
        </div>

        {milestone.is_completed && (
          <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
      </div>
    </button>
  );
}
