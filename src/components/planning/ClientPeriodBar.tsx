import { useMemo } from 'react';
import { Client, MilestoneWithClient, MILESTONE_TYPE_CONFIG, MilestoneType, LABEL_VISIBLE_TYPES } from '@/lib/planning/types';
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

// Compact label constants
const MAX_LABEL_LENGTH = 15;
const MIN_LABEL_DISTANCE_PERCENT = 6; // 6% of total width - tighter packing

function truncateLabel(title: string): string {
  return title.length > MAX_LABEL_LENGTH 
    ? title.slice(0, MAX_LABEL_LENGTH - 1).trim() + '…' 
    : title;
}

// Format date compact: "5. Mär" 
function formatDateCompact(date: Date): string {
  return format(date, 'd. MMM', { locale: de });
}

interface EnrichedPosition {
  milestone: MilestoneWithClient;
  left: number;
  showLabel: boolean;
  labelPosition: 'above' | 'below';
}

export function ClientPeriodBar({ 
  client, 
  milestones, 
  viewRange, 
  onMilestoneClick,
  showLabels = false
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

  // Enrich positions with smart label visibility and stagger logic
  const enrichedPositions: EnrichedPosition[] = useMemo(() => {
    let lastVisibleLabelLeft = -Infinity;
    let staggerIndex = 0;
    
    return milestonePositions.map((mp) => {
      const typeKey = mp.milestone.milestone_type as MilestoneType;
      const shouldShowLabel = LABEL_VISIBLE_TYPES.includes(typeKey);
      
      if (!shouldShowLabel) {
        return { ...mp, showLabel: false, labelPosition: 'above' as const };
      }
      
      // Check distance to previous visible label
      const distance = mp.left - lastVisibleLabelLeft;
      const needsStagger = distance < MIN_LABEL_DISTANCE_PERCENT;
      
      // Determine position - alternate when staggering
      let labelPosition: 'above' | 'below' = 'above';
      if (needsStagger) {
        labelPosition = staggerIndex % 2 === 0 ? 'below' : 'above';
        staggerIndex++;
      } else {
        staggerIndex = 0; // Reset when no stagger needed
      }
      
      lastVisibleLabelLeft = mp.left;
      
      return { ...mp, showLabel: true, labelPosition };
    });
  }, [milestonePositions]);

  const renderMilestoneMarker = (mp: EnrichedPosition, relativeLeft?: number) => {
    const { milestone, showLabel: mpShowLabel, labelPosition } = mp;
    const Icon = ICON_MAP[milestone.milestone_type as MilestoneType] || Circle;
    const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type as MilestoneType];
    const leftPos = relativeLeft !== undefined ? relativeLeft : mp.left;
    
    return (
      <div 
        key={milestone.id} 
        className="absolute top-1/2 -translate-y-1/2" 
        style={{ left: `${leftPos}%` }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onMilestoneClick(milestone)}
                className="-translate-x-1/2 z-10 p-1.5 rounded-full bg-background border-2 hover:scale-105 transition-transform shadow-xs"
                style={{ 
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
                {format(new Date(milestone.date), 'd. MMMM yyyy', { locale: de })}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Smart Label - only for critical milestone types */}
        {showLabels && mpShowLabel && (
          <div 
            className={cn(
              "absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20",
              labelPosition === 'above' ? "bottom-full mb-1" : "top-full mt-1",
              labelPosition === 'below' && "flex-col-reverse"
            )}
          >
            {labelPosition === 'above' ? (
              <>
                <div className="text-center">
                  <div className="text-[11px] font-medium text-foreground leading-tight max-w-[100px] truncate">
                    {truncateLabel(milestone.title)}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80">
                    {format(new Date(milestone.date), 'd. MMM', { locale: de })}
                  </div>
                </div>
                <div className="w-px h-1.5 bg-muted-foreground/25" />
              </>
            ) : (
              <>
                <div className="w-px h-1.5 bg-muted-foreground/25" />
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground/80">
                    {format(new Date(milestone.date), 'd. MMM', { locale: de })}
                  </div>
                  <div className="text-[11px] font-medium text-foreground leading-tight max-w-[100px] truncate">
                    {truncateLabel(milestone.title)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // If no date range, show milestones as individual markers
  if (!hasDateRange || !barPosition) {
    return (
      <div className="relative h-12 w-full">
        {enrichedPositions.map((mp) => renderMilestoneMarker(mp))}
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
        {enrichedPositions.map((mp) => {
          // Calculate position relative to bar
          const relativeLeft = ((mp.left - barPosition.left) / barPosition.width) * 100;
          
          // Skip if outside bar bounds
          if (relativeLeft < 0 || relativeLeft > 100) return null;
          
          return renderMilestoneMarker(mp, relativeLeft);
        })}
      </div>
    </div>
  );
}
