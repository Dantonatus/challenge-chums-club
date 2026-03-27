import { useMemo, useRef } from 'react';
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
  FileSignature, Rocket, AlertTriangle, Users, Package, CreditCard, Circle 
} from 'lucide-react';

interface ClientPeriodBarProps {
  client: Client;
  milestones: MilestoneWithClient[];
  viewRange: { start: Date; end: Date };
  onMilestoneClick: (m: MilestoneWithClient) => void;
  showLabels?: boolean;
}

const ICON_MAP: Record<MilestoneType, React.ComponentType<{ className?: string }>> = {
  contract: FileSignature, kickoff: Rocket, deadline: AlertTriangle,
  meeting: Users, delivery: Package, payment: CreditCard, general: Circle,
};

const LABEL_WIDTH_PERCENT = 9;

function formatDateCompact(date: Date): string {
  return format(date, 'd. MMM', { locale: de });
}

interface EnrichedPosition {
  milestone: MilestoneWithClient;
  left: number;        // icon position (%)
  showLabel: boolean;
  labelPosition: 'above' | 'below';
  displayLeft: number; // label center position (%), may differ from left
}

function spreadLabels(positions: EnrichedPosition[]): EnrichedPosition[] {
  const result = positions.map(p => ({ ...p }));
  const labelsOnly = result.filter(p => p.showLabel);
  if (labelsOnly.length < 2) return result;

  for (const group of ['above', 'below'] as const) {
    const groupLabels = labelsOnly.filter(l => l.labelPosition === group);
    if (groupLabels.length < 2) continue;
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (let i = 0; i < groupLabels.length - 1; i++) {
        const dist = groupLabels[i + 1].displayLeft - groupLabels[i].displayLeft;
        if (dist < LABEL_WIDTH_PERCENT) {
          const shift = (LABEL_WIDTH_PERCENT - dist) / 2;
          groupLabels[i].displayLeft -= shift;
          groupLabels[i + 1].displayLeft += shift;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }
  return result;
}

export function ClientPeriodBar({ client, milestones, viewRange, onMilestoneClick, showLabels = false }: ClientPeriodBarProps) {
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
    if (isAfter(clientStart, viewEnd) || isBefore(clientEnd, viewStart)) return null;
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
      .filter(m => isWithinInterval(new Date(m.date), { start: viewStart, end: viewEnd }))
      .map(m => ({
        milestone: m,
        left: (differenceInDays(new Date(m.date), viewStart) / totalDays) * 100,
      }))
      .sort((a, b) => a.left - b.left);
  }, [milestones, viewRange]);

  const enrichedPositions: EnrichedPosition[] = useMemo(() => {
    let staggerIndex = 0;
    let lastVisibleLeft = -Infinity;
    const initial: EnrichedPosition[] = milestonePositions.map((mp) => {
      const typeKey = mp.milestone.milestone_type as MilestoneType;
      if (!LABEL_VISIBLE_TYPES.includes(typeKey)) {
        return { ...mp, showLabel: false, labelPosition: 'above' as const, displayLeft: mp.left };
      }
      const distance = mp.left - lastVisibleLeft;
      const needsStagger = distance < LABEL_WIDTH_PERCENT * 2;
      let labelPosition: 'above' | 'below' = 'above';
      if (needsStagger) {
        labelPosition = staggerIndex % 2 === 0 ? 'below' : 'above';
        staggerIndex++;
      } else {
        staggerIndex = 0;
      }
      lastVisibleLeft = mp.left;
      return { ...mp, showLabel: true, labelPosition, displayLeft: mp.left };
    });
    return spreadLabels(initial);
  }, [milestonePositions]);

  // Render icon at iconLeft%, with optional label
  const renderIcon = (mp: EnrichedPosition, iconLeft: number) => {
    const { milestone } = mp;
    const Icon = ICON_MAP[milestone.milestone_type as MilestoneType] || Circle;
    const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type as MilestoneType];
    return (
      <div key={milestone.id} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${iconLeft}%` }}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onMilestoneClick(milestone)}
                className="-translate-x-1/2 z-10 p-1.5 rounded-full bg-background border-2 hover:scale-105 transition-transform shadow-xs"
                style={{ borderColor: config?.color || client.color }}
              >
                <Icon className="h-4 w-4" style={{ color: config?.color || client.color }} />
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
      </div>
    );
  };

  // Render label at displayLeft%, with a slanted line pointing back to iconLeft%
  const renderLabel = (mp: EnrichedPosition, iconLeft: number, displayLeft: number) => {
    if (!showLabels || !mp.showLabel) return null;
    const { milestone, labelPosition } = mp;
    // The horizontal offset of the line end relative to label center (in %)
    const lineOffsetPercent = iconLeft - displayLeft;

    return (
      <div
        key={`label-${milestone.id}`}
        className={cn(
          "absolute pointer-events-none z-20 flex flex-col items-center",
          labelPosition === 'above' ? "bottom-1/2 mb-5" : "top-1/2 mt-5"
        )}
        style={{ left: `${displayLeft}%`, transform: 'translateX(-50%)' }}
      >
        {/* Connection line - SVG for slanted line */}
        <svg
          className={cn("overflow-visible", labelPosition === 'above' ? "order-last" : "order-first")}
          width="0" height="12"
          style={{ overflow: 'visible' }}
        >
          <line
            x1="0" y1={labelPosition === 'above' ? '12' : '0'}
            x2="0" y2={labelPosition === 'above' ? '12' : '0'}
            stroke="rgba(60, 60, 60, 0.7)" strokeWidth="2"
          />
          {/* Slanted portion: from label center (0,end) to icon offset */}
          <line
            x1="0"
            y1={labelPosition === 'above' ? '0' : '12'}
            x2={`${lineOffsetPercent * 0.01 * 800}`}
            y2={labelPosition === 'above' ? '12' : '0'}
            stroke="rgba(60, 60, 60, 0.7)"
            strokeWidth="1.5"
          />
        </svg>

        <div className="text-center" style={{ width: '140px' }}>
          <div className="text-[11px] font-bold text-foreground leading-tight whitespace-nowrap">
            {formatDateCompact(new Date(milestone.date))}
          </div>
          <div className="text-[10px] text-muted-foreground leading-snug line-clamp-3" style={{ wordBreak: 'break-word' }}>
            {milestone.title}
          </div>
        </div>
      </div>
    );
  };

  if (!hasDateRange || !barPosition) {
    return (
      <div className="relative h-12 w-full">
        {enrichedPositions.map(mp => renderIcon(mp, mp.left))}
        {enrichedPositions.map(mp => renderLabel(mp, mp.left, mp.displayLeft))}
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
          <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${client.color}40, transparent)` }} />
        )}
        {barPosition.endsAfterView && (
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ background: `linear-gradient(to left, ${client.color}40, transparent)` }} />
        )}

        {enrichedPositions.map(mp => {
          const relIcon = ((mp.left - barPosition.left) / barPosition.width) * 100;
          if (relIcon < -2 || relIcon > 102) return null;
          return renderIcon(mp, relIcon);
        })}
        {enrichedPositions.map(mp => {
          const relIcon = ((mp.left - barPosition.left) / barPosition.width) * 100;
          const relLabel = ((mp.displayLeft - barPosition.left) / barPosition.width) * 100;
          if (relIcon < -2 || relIcon > 102) return null;
          return renderLabel(mp, relIcon, relLabel);
        })}
      </div>
    </div>
  );
}
