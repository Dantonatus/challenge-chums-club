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

// Label effective width in percent of total bar
const LABEL_WIDTH_PERCENT = 9;

function formatDateCompact(date: Date): string {
  return format(date, 'd. MMM', { locale: de });
}

interface EnrichedPosition {
  milestone: MilestoneWithClient;
  left: number;
  showLabel: boolean;
  labelPosition: 'above' | 'below';
  displayLeft: number; // nudged position for label
}

/**
 * Spread labels apart so they don't overlap.
 * Iterates up to 3 times, nudging overlapping pairs symmetrically.
 */
function spreadLabels(positions: EnrichedPosition[]): EnrichedPosition[] {
  const labelPositions = positions.map(p => ({ ...p }));
  const labelsOnly = labelPositions.filter(p => p.showLabel);
  
  if (labelsOnly.length < 2) return labelPositions;

  // Group by labelPosition (above/below) and spread within each group
  for (const group of ['above', 'below'] as const) {
    const groupLabels = labelsOnly.filter(l => l.labelPosition === group);
    if (groupLabels.length < 2) continue;

    for (let iter = 0; iter < 3; iter++) {
      let anyOverlap = false;
      for (let i = 0; i < groupLabels.length - 1; i++) {
        const a = groupLabels[i];
        const b = groupLabels[i + 1];
        const minDist = LABEL_WIDTH_PERCENT;
        const dist = b.displayLeft - a.displayLeft;
        if (dist < minDist) {
          const shift = (minDist - dist) / 2;
          a.displayLeft -= shift;
          b.displayLeft += shift;
          anyOverlap = true;
        }
      }
      if (!anyOverlap) break;
    }
  }

  return labelPositions;
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
    
    const visibleStart = isBefore(clientStart, viewStart) ? viewStart : clientStart;
    const visibleEnd = isAfter(clientEnd, viewEnd) ? viewEnd : clientEnd;
    
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

  const enrichedPositions: EnrichedPosition[] = useMemo(() => {
    let staggerIndex = 0;
    let lastVisibleLabelLeft = -Infinity;
    
    const initial: EnrichedPosition[] = milestonePositions.map((mp) => {
      const typeKey = mp.milestone.milestone_type as MilestoneType;
      const shouldShowLabel = LABEL_VISIBLE_TYPES.includes(typeKey);
      
      if (!shouldShowLabel) {
        return { ...mp, showLabel: false, labelPosition: 'above' as const, displayLeft: mp.left };
      }
      
      const distance = mp.left - lastVisibleLabelLeft;
      const needsStagger = distance < LABEL_WIDTH_PERCENT * 2;
      
      let labelPosition: 'above' | 'below' = 'above';
      if (needsStagger) {
        labelPosition = staggerIndex % 2 === 0 ? 'below' : 'above';
        staggerIndex++;
      } else {
        staggerIndex = 0;
      }
      
      lastVisibleLabelLeft = mp.left;
      
      return { ...mp, showLabel: true, labelPosition, displayLeft: mp.left };
    });

    return spreadLabels(initial);
  }, [milestonePositions]);

  const renderMilestoneMarker = (mp: EnrichedPosition, relativeLeft?: number) => {
    const { milestone, showLabel: mpShowLabel, labelPosition, displayLeft } = mp;
    const Icon = ICON_MAP[milestone.milestone_type as MilestoneType] || Circle;
    const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type as MilestoneType];
    const iconLeft = relativeLeft !== undefined ? relativeLeft : mp.left;
    
    // Calculate label offset relative to icon position
    const labelLeftInContext = relativeLeft !== undefined && barPosition
      ? ((displayLeft - barPosition.left) / barPosition.width) * 100
      : displayLeft;
    const labelOffset = labelLeftInContext - iconLeft; // percent offset from icon
    
    return (
      <div 
        key={milestone.id} 
        className="absolute top-1/2 -translate-y-1/2" 
        style={{ left: `${iconLeft}%` }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onMilestoneClick(milestone)}
                className="-translate-x-1/2 z-10 p-1.5 rounded-full bg-background border-2 hover:scale-105 transition-transform shadow-xs"
                style={{ borderColor: config?.color || client.color }}
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
        
        {showLabels && mpShowLabel && (
          <div 
            className={cn(
              "absolute pointer-events-none z-20",
              labelPosition === 'above' ? "bottom-full mb-1" : "top-full mt-1"
            )}
            style={{ 
              left: `calc(50% + ${labelOffset}% * var(--bar-width, 1))`,
              // We position relative to the icon center, shifting by the computed offset
            }}
          >
            {/* Use a wrapper that positions the label centered at displayLeft */}
            <div 
              className="flex flex-col items-center"
              style={{ 
                transform: `translateX(calc(-50%))`,
                marginLeft: `${labelOffset * 0.01 * (relativeLeft !== undefined ? 1 : 1)}px`
              }}
            >
              {/* Slanted connection line via SVG */}
              <svg 
                className={cn(
                  "overflow-visible",
                  labelPosition === 'above' ? "order-last" : "order-first"
                )}
                width="2" 
                height="12" 
                style={{ overflow: 'visible' }}
              >
                <line 
                  x1="0" 
                  y1={labelPosition === 'above' ? '0' : '0'} 
                  x2={`${-labelOffset * 0.5}`} 
                  y2={labelPosition === 'above' ? '12' : '12'} 
                  stroke="rgba(60, 60, 60, 0.7)" 
                  strokeWidth="2" 
                />
              </svg>
              
              <div className="text-center" style={{ width: '140px' }}>
                <div className="text-[11px] font-bold text-foreground leading-tight whitespace-nowrap">
                  {formatDateCompact(new Date(milestone.date))}
                </div>
                <div 
                  className="text-[10px] text-muted-foreground leading-snug line-clamp-3"
                  style={{ wordBreak: 'break-word' }}
                >
                  {milestone.title}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!hasDateRange || !barPosition) {
    return (
      <div className="relative h-12 w-full">
        {enrichedPositions.map((mp) => renderMilestoneMarker(mp))}
      </div>
    );
  }

  return (
    <div className="relative h-12 w-full">
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
        {barPosition.startsBeforeView && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${client.color}40, transparent)` }}
          />
        )}
        {barPosition.endsAfterView && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ background: `linear-gradient(to left, ${client.color}40, transparent)` }}
          />
        )}

        {enrichedPositions.map((mp) => {
          const relativeLeft = ((mp.left - barPosition.left) / barPosition.width) * 100;
          if (relativeLeft < 0 || relativeLeft > 100) return null;
          return renderMilestoneMarker(mp, relativeLeft);
        })}
      </div>
    </div>
  );
}
