import { useMemo } from 'react';
import { Client, MilestoneWithClient, MILESTONE_TYPE_CONFIG, MilestoneType, LABEL_VISIBLE_TYPES, PlanningProject } from '@/lib/planning/types';
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
  Circle,
  CheckCircle2
} from 'lucide-react';

interface ClientPeriodBarProps {
  client: Client;
  milestones: MilestoneWithClient[];
  projects?: PlanningProject[];
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

// Compact label constants - no truncation, allow 2 lines
const MIN_LABEL_DISTANCE_PERCENT = 18; // 18% of total width - prevents overlap on 6-month view

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

interface BarSegment {
  left: number;
  width: number;
  color: string;
  label: string;
  isCompleted: boolean;
  startsBeforeView: boolean;
  endsAfterView: boolean;
}

function calcBarPosition(
  startDate: string | null, 
  endDate: string | null, 
  viewRange: { start: Date; end: Date }
): { left: number; width: number; startsBeforeView: boolean; endsAfterView: boolean } | null {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const viewStart = viewRange.start;
  const viewEnd = viewRange.end;
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;
  
  if (isAfter(start, viewEnd) || isBefore(end, viewStart)) return null;
  
  const visibleStart = isBefore(start, viewStart) ? viewStart : start;
  const visibleEnd = isAfter(end, viewEnd) ? viewEnd : end;
  
  const leftDays = differenceInDays(visibleStart, viewStart);
  const widthDays = differenceInDays(visibleEnd, visibleStart) + 1;
  
  return {
    left: (leftDays / totalDays) * 100,
    width: (widthDays / totalDays) * 100,
    startsBeforeView: isBefore(start, viewStart),
    endsAfterView: isAfter(end, viewEnd),
  };
}

export function ClientPeriodBar({ 
  client, 
  milestones, 
  projects,
  viewRange, 
  onMilestoneClick,
  showLabels = false
}: ClientPeriodBarProps) {
  
  // Build bar segments from projects or fallback to client dates
  const barSegments = useMemo((): BarSegment[] => {
    if (projects && projects.length > 0) {
      return projects
        .map(p => {
          const pos = calcBarPosition(p.start_date, p.end_date, viewRange);
          if (!pos) return null;
          return {
            ...pos,
            color: p.color || client.color,
            label: p.name,
            isCompleted: p.status === 'completed',
          };
        })
        .filter(Boolean) as BarSegment[];
    }
    
    // Fallback: single bar from client dates
    if (client.start_date && client.end_date) {
      const pos = calcBarPosition(client.start_date, client.end_date, viewRange);
      if (pos) {
        return [{
          ...pos,
          color: client.color,
          label: '',
          isCompleted: false,
        }];
      }
    }
    
    return [];
  }, [projects, client, viewRange]);

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
        
        {/* Compact Label - ALWAYS centered directly above/below the milestone icon */}
        {showLabels && mpShowLabel && (
          <div 
            className={cn(
              "absolute pointer-events-none z-20 flex flex-col items-center",
              "left-1/2 -translate-x-1/2", // Always centered on the icon
              labelPosition === 'above' ? "bottom-full mb-1" : "top-full mt-1"
            )}
          >
            {/* Connection line - always points toward the icon */}
            {labelPosition === 'above' && (
              <div className="order-last w-0.5 h-3" style={{ backgroundColor: 'rgba(60, 60, 60, 0.7)' }} />
            )}
            {labelPosition === 'below' && (
              <div className="order-first w-0.5 h-3" style={{ backgroundColor: 'rgba(60, 60, 60, 0.7)' }} />
            )}
            
            {/* Text content - centered, with enough room for text */}
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
        )}
      </div>
    );
  };

  // If no segments, show milestones as individual markers
  if (barSegments.length === 0) {
    return (
      <div className="relative h-12 w-full">
        {enrichedPositions.map((mp) => renderMilestoneMarker(mp))}
      </div>
    );
  }

  // Calculate the bounding box of all segments for milestone relative positioning
  const overallLeft = Math.min(...barSegments.map(s => s.left));
  const overallRight = Math.max(...barSegments.map(s => s.left + s.width));
  const overallWidth = overallRight - overallLeft;

  return (
    <div className="relative h-12 w-full">
      {/* Render each project segment */}
      {barSegments.map((segment, idx) => (
        <TooltipProvider key={idx}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-10 rounded-lg border-t-4 transition-all",
                  segment.startsBeforeView && "rounded-l-none",
                  segment.endsAfterView && "rounded-r-none",
                  segment.isCompleted && "opacity-60"
                )}
                style={{
                  left: `${segment.left}%`,
                  width: `${segment.width}%`,
                  backgroundColor: `${segment.color}20`,
                  borderTopColor: segment.color,
                }}
              >
                {/* Fade edges when period extends beyond view */}
                {segment.startsBeforeView && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none"
                    style={{ background: `linear-gradient(to right, ${segment.color}40, transparent)` }}
                  />
                )}
                {segment.endsAfterView && (
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
                    style={{ background: `linear-gradient(to left, ${segment.color}40, transparent)` }}
                  />
                )}

                {/* Project name label inside bar */}
                {segment.label && segment.width > 8 && (
                  <div className="absolute inset-0 flex items-center justify-center px-1 overflow-hidden">
                    <span 
                      className={cn(
                        "text-[10px] font-medium truncate flex items-center gap-1",
                        segment.isCompleted && "line-through"
                      )}
                      style={{ color: segment.color }}
                    >
                      {segment.isCompleted && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                      {segment.label}
                    </span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            {segment.label && (
              <TooltipContent>
                <p className="font-medium">{segment.label}</p>
                {segment.isCompleted && (
                  <p className="text-xs text-muted-foreground">Abgeschlossen</p>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ))}

      {/* Milestone markers positioned globally across all segments */}
      {enrichedPositions.map((mp) => renderMilestoneMarker(mp))}
    </div>
  );
}