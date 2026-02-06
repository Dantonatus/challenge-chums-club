import { useMemo } from 'react';
import { Quarter, getQuarterMonths, getQuarterDateRange, MilestoneWithClient, Client } from '@/lib/planning/types';
import { ClientBadge } from './ClientBadge';
import { ClientPeriodBar } from './ClientPeriodBar';
import { format, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QuarterCalendarProps {
  quarter: Quarter;
  clientData: Array<{
    client: Client;
    milestones: MilestoneWithClient[];
  }>;
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
  onClientClick: (client: Client) => void;
}

const MAX_VISIBLE_CLIENTS = 7;
const ROW_HEIGHT = 80;

export function QuarterCalendar({ quarter, clientData, onMilestoneClick, onClientClick }: QuarterCalendarProps) {
  const months = getQuarterMonths(quarter);
  const monthDates = months.map(m => new Date(quarter.year, m, 1));
  const viewRange = getQuarterDateRange(quarter);

  const needsScroll = clientData.length > MAX_VISIBLE_CLIENTS;

  if (clientData.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card relative">
      {/* Month headers */}
      <div className="grid grid-cols-[180px_1fr_1fr_1fr] border-b bg-muted/30 sticky top-0 z-20">
        <div className="p-3 border-r text-sm font-medium text-muted-foreground" />
        {monthDates.map((date, i) => (
          <div 
            key={i} 
            className={cn(
              "p-3 text-center font-semibold border-r last:border-r-0",
              isSameMonth(date, new Date()) && "bg-primary/5"
            )}
          >
            <span className="text-lg">{format(date, 'MMMM', { locale: de })}</span>
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
            className="grid grid-cols-[180px_1fr] border-b last:border-b-0 group hover:bg-muted/10 transition-colors"
            style={{ height: `${ROW_HEIGHT}px` }}
          >
            {/* Client column */}
            <div 
              className="p-3 border-r flex items-center"
              style={{ borderLeftColor: client.color, borderLeftWidth: '4px' }}
            >
              <ClientBadge client={client} onClick={() => onClientClick(client)} />
            </div>

            {/* Timeline area */}
            <div className="relative">
              {/* Month grid lines */}
              <div className="absolute inset-0 grid grid-cols-3">
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
              <div className="relative h-full flex items-center px-2">
                <ClientPeriodBar
                  client={client}
                  milestones={milestones}
                  viewRange={viewRange}
                  onMilestoneClick={onMilestoneClick}
                />
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Today indicator line */}
      <TodayLine quarter={quarter} clientColumnWidth={180} />
    </div>
  );
}

function TodayLine({ quarter, clientColumnWidth }: { quarter: Quarter; clientColumnWidth: number }) {
  const today = new Date();
  const months = getQuarterMonths(quarter);
  
  // Check if today is in this quarter
  const isInQuarter = months.some(m => 
    today.getFullYear() === quarter.year && today.getMonth() === m
  );
  
  if (!isInQuarter) return null;

  // Calculate position
  const monthIndex = months.indexOf(today.getMonth());
  if (monthIndex === -1) return null;

  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(quarter.year, today.getMonth() + 1, 0).getDate();
  const percentInMonth = (dayOfMonth / daysInMonth) * 100;

  // Position: (monthIndex * columnWidth) + percentInMonth of columnWidth
  const monthWidth = 100 / 3; // 3 months
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
