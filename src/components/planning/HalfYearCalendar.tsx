import { useMemo } from 'react';
import { HalfYear, getHalfYearMonths, getHalfYearDateRange, MilestoneWithClient, Client } from '@/lib/planning/types';
import { ClientBadge } from './ClientBadge';
import { ClientPeriodBar } from './ClientPeriodBar';
import { format, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HalfYearCalendarProps {
  halfYear: HalfYear;
  clientData: Array<{
    client: Client;
    milestones: MilestoneWithClient[];
  }>;
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
  onClientClick: (client: Client) => void;
  showLabels?: boolean;
}

const MAX_VISIBLE_CLIENTS = 7;
const ROW_HEIGHT_COMPACT = 80;
const ROW_HEIGHT_EXPANDED = 120;

export function HalfYearCalendar({ halfYear, clientData, onMilestoneClick, onClientClick, showLabels = false }: HalfYearCalendarProps) {
  const months = getHalfYearMonths(halfYear);
  const monthDates = months.map(m => new Date(halfYear.year, m, 1));
  const viewRange = getHalfYearDateRange(halfYear);

  const rowHeight = showLabels ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COMPACT;
  const needsScroll = clientData.length > MAX_VISIBLE_CLIENTS;

  if (clientData.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Month headers - sticky */}
      <div className="grid grid-cols-[140px_repeat(6,1fr)] border-b bg-muted/30 sticky top-0 z-20">
        <div className="p-2 border-r text-xs font-medium text-muted-foreground">
          Kunden
        </div>
        {monthDates.map((date, i) => (
          <div 
            key={i} 
            className={cn(
              "p-2 text-center font-medium text-sm border-r last:border-r-0",
              isSameMonth(date, new Date()) && "bg-primary/5"
            )}
          >
            {format(date, 'MMM', { locale: de })}
          </div>
        ))}
      </div>

      {/* Client rows */}
      <ScrollArea 
        className={cn(needsScroll && "h-[560px]")}
        style={{ height: needsScroll ? `${MAX_VISIBLE_CLIENTS * ROW_HEIGHT}px` : 'auto' }}
      >
        {clientData.map(({ client, milestones }) => (
          <div 
            key={client.id} 
            className="grid grid-cols-[140px_1fr] border-b last:border-b-0 group hover:bg-muted/10 transition-colors"
            style={{ height: `${ROW_HEIGHT}px` }}
          >
            {/* Client column */}
            <div 
              className="p-2 border-r flex items-center"
              style={{ borderLeftColor: client.color, borderLeftWidth: '4px' }}
            >
              <ClientBadge client={client} compact onClick={() => onClientClick(client)} />
            </div>

            {/* Timeline area */}
            <div className="relative px-1">
              {/* Month grid lines */}
              <div className="absolute inset-0 grid grid-cols-6">
                {monthDates.map((date, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "border-r last:border-r-0",
                      isSameMonth(date, new Date()) && "bg-primary/5"
                    )}
                  />
                ))}
              </div>

              {/* Client period bar with milestones */}
              <ClientPeriodBar
                client={client}
                milestones={milestones}
                viewRange={viewRange}
                onMilestoneClick={onMilestoneClick}
                showLabels={showLabels}
              />
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Today indicator */}
      <TodayLine halfYear={halfYear} clientColumnWidth={140} />
    </div>
  );
}

function TodayLine({ halfYear, clientColumnWidth }: { halfYear: HalfYear; clientColumnWidth: number }) {
  const today = new Date();
  const months = getHalfYearMonths(halfYear);
  
  // Check if today is in this half year
  const isInHalfYear = months.some(m => 
    today.getFullYear() === halfYear.year && today.getMonth() === m
  );
  
  if (!isInHalfYear) return null;

  // Calculate position
  const monthIndex = months.indexOf(today.getMonth());
  if (monthIndex === -1) return null;

  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(halfYear.year, today.getMonth() + 1, 0).getDate();
  const percentInMonth = (dayOfMonth / daysInMonth) * 100;

  // Position: client column + (monthIndex * columnWidth) + percentInMonth of columnWidth
  const monthWidth = 100 / 6; // 6 months
  const leftPercent = (monthIndex * monthWidth) + (percentInMonth * monthWidth / 100);

  return (
    <div 
      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
      style={{ left: `calc(${clientColumnWidth}px + ${leftPercent}%)` }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
    </div>
  );
}
