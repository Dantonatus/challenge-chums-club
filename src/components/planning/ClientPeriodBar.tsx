import { useMemo } from 'react';
import { Client, MilestoneWithClient, MILESTONE_TYPE_CONFIG, MilestoneType } from '@/lib/planning/types';
import { differenceInDays, isWithinInterval, format, isBefore, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  FileSignature, 
  Rocket, 
  AlertTriangle, 
  Users, 
  Package, 
  CreditCard, 
  Circle 
} from 'lucide-react';

interface ClientPeriodBarProps {
  client: Client;
  milestones: MilestoneWithClient[];
  viewRange: { start: Date; end: Date };
  onMilestoneClick: (m: MilestoneWithClient) => void;
  showLabels?: boolean;
}

const ICON_MAP: Record<MilestoneType, React.ComponentType<{ className?: string }>> = {
  contract: FileSignature,
  kickoff: Rocket,
  deadline: AlertTriangle,
  meeting: Users,
  delivery: Package,
  payment: CreditCard,
  general: Circle,
};

export function ClientPeriodBar({ 
  client, 
  milestones, 
  viewRange, 
  onMilestoneClick 
}: ClientPeriodBarProps) {
  const hasDateRange = client.start_date && client.end_date;
  
  const barPosition = useMemo(() => {
    if (!hasDateRange) return null;
    
    const clientStart = new Date(client.start_date!);
    const clientEnd = new Date(client.end_date!);
    const viewStart = viewRange.start;
    const viewEnd = viewRange.end;
    const totalDays = differenceInDays(viewEnd, viewStart) + 1;
    
    // Calculate visible portion of client period
    const visibleStart = isBefore(clientStart, viewStart) ? viewStart : clientStart;
    const visibleEnd = isAfter(clientEnd, viewEnd) ? viewEnd : clientEnd;
    
    // Check if period is visible at all
    if (isAfter(clientStart, viewEnd) || isBefore(clientEnd, viewStart)) {
      return null;
    }
    
    const leftDays = differenceInDays(visibleStart, viewStart);
    const widthDays = differenceInDays(visibleEnd, visibleStart) + 1;
    
    return {
      left: (leftDays / totalDays) * 100,
      width: (widthDays / totalDays) * 100,
      startsBeforeView: isBefore(clientStart, viewStart),
      endsAfterView: isAfter(clientEnd, viewEnd),
    };
  }, [client.start_date, client.end_date, viewRange, hasDateRange]);

  const milestonePositions = useMemo(() => {
    const viewStart = viewRange.start;
    const viewEnd = viewRange.end;
    const totalDays = differenceInDays(viewEnd, viewStart) + 1;
    
    return milestones
      .filter(m => {
        const mDate = new Date(m.date);
        return isWithinInterval(mDate, { start: viewStart, end: viewEnd });
      })
      .map(m => {
        const mDate = new Date(m.date);
        const daysFromStart = differenceInDays(mDate, viewStart);
        return {
          milestone: m,
          left: (daysFromStart / totalDays) * 100,
        };
      })
      .sort((a, b) => a.left - b.left);
  }, [milestones, viewRange]);

  // If no date range, show milestones as individual markers
  if (!hasDateRange || !barPosition) {
    return (
      <div className="relative h-12 w-full">
        {milestonePositions.map(({ milestone, left }) => {
          const Icon = ICON_MAP[milestone.milestone_type as MilestoneType] || Circle;
          const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type as MilestoneType];
          
          return (
            <TooltipProvider key={milestone.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onMilestoneClick(milestone)}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-1.5 rounded-full bg-background border-2 hover:scale-110 transition-transform"
                    style={{ 
                      left: `${left}%`,
                      borderColor: config?.color || client.color 
                    }}
                  >
                    <Icon 
                      className="h-4 w-4" 
                      style={{ color: config?.color || client.color }} 
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{milestone.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(milestone.date), 'd. MMMM', { locale: de })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative h-12 w-full">
      {/* Period bar */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 h-10 rounded-lg border-t-4 transition-all",
          barPosition.startsBeforeView && "rounded-l-none",
          barPosition.endsAfterView && "rounded-r-none"
        )}
        style={{
          left: `${barPosition.left}%`,
          width: `${barPosition.width}%`,
          backgroundColor: `${client.color}20`,
          borderTopColor: client.color,
        }}
      >
        {/* Fade edges when period extends beyond view */}
        {barPosition.startsBeforeView && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ 
              background: `linear-gradient(to right, ${client.color}40, transparent)` 
            }}
          />
        )}
        {barPosition.endsAfterView && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ 
              background: `linear-gradient(to left, ${client.color}40, transparent)` 
            }}
          />
        )}

        {/* Milestone markers on bar */}
        {milestonePositions.map(({ milestone, left: absLeft }) => {
          // Calculate position relative to bar
          const relativeLeft = ((absLeft - barPosition.left) / barPosition.width) * 100;
          
          // Skip if outside bar bounds
          if (relativeLeft < 0 || relativeLeft > 100) return null;
          
          const Icon = ICON_MAP[milestone.milestone_type as MilestoneType] || Circle;
          const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type as MilestoneType];
          
          return (
            <TooltipProvider key={milestone.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onMilestoneClick(milestone)}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-1 rounded-full bg-background border hover:scale-110 transition-transform shadow-sm"
                    style={{ 
                      left: `${relativeLeft}%`,
                      borderColor: config?.color || 'currentColor'
                    }}
                  >
                    <Icon 
                      className="h-3 w-3" 
                      style={{ color: config?.color || 'currentColor' }} 
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{milestone.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(milestone.date), 'd. MMMM yyyy', { locale: de })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
