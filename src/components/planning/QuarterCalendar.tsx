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
  showLabels?: boolean;
}

const MAX_VISIBLE_CLIENTS = 7;
const ROW_HEIGHT_COMPACT = 80;
const ROW_HEIGHT_EXPANDED = 160; // More space for staggered 2-line labels

interface ClientRowProps {
  client: Client;
  milestones: MilestoneWithClient[];
  rowHeight: number;
  monthDates: Date[];
  viewRange: { start: Date; end: Date };
  onClientClick: (client: Client) => void;
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
  showLabels: boolean;
}

function ClientRow({ 
  client, 
  milestones, 
  rowHeight, 
  monthDates, 
  viewRange, 
  onClientClick, 
  onMilestoneClick,
  showLabels 
}: ClientRowProps) {
  return (
    <div 
      className="grid grid-cols-[180px_1fr] border-b last:border-b-0 group hover:bg-muted/5 transition-colors"
      style={{ height: `${rowHeight}px` }}
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

        {/* Client period bar with milestones - overflow visible for labels */}
        <div className="relative h-full flex items-center px-2 overflow-visible">
          <ClientPeriodBar
            client={client}
            milestones={milestones}
            viewRange={viewRange}
            onMilestoneClick={onMilestoneClick}
            showLabels={showLabels}
          />
        </div>
      </div>
    </div>
  );
}

export function QuarterCalendar({ quarter, clientData, onMilestoneClick, onClientClick, showLabels = false }: QuarterCalendarProps) {
  const months = getQuarterMonths(quarter);
  const monthDates = months.map(m => new Date(quarter.year, m, 1));
  const viewRange = getQuarterDateRange(quarter);

  const rowHeight = showLabels ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COMPACT;
  const needsScroll = clientData.length > MAX_VISIBLE_CLIENTS;

  if (clientData.length === 0) {
    return null;
  }

  const renderClientRows = () => (
    <>
      {clientData.map(({ client, milestones }) => (
        <ClientRow 
          key={client.id}
          client={client}
          milestones={milestones}
          rowHeight={rowHeight}
          monthDates={monthDates}
          viewRange={viewRange}
          onClientClick={onClientClick}
          onMilestoneClick={onMilestoneClick}
          showLabels={showLabels}
        />
      ))}
    </>
  );

  return (
    <div id="planning-chart-export-wrapper" className="p-6 -m-6 bg-background">
      <div id="planning-chart" className="border rounded-xl bg-card relative overflow-visible">
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
      {needsScroll ? (
        <ScrollArea style={{ height: `${MAX_VISIBLE_CLIENTS * rowHeight}px` }}>
          {renderClientRows()}
        </ScrollArea>
      ) : (
        <div>{renderClientRows()}</div>
      )}

        {/* Today indicator line */}
        <TodayLine quarter={quarter} clientColumnWidth={180} />
      </div>
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
      className="absolute top-0 bottom-0 w-0.5 bg-primary z-5 pointer-events-none"
      style={{ left: `calc(${clientColumnWidth}px + ${leftPercent}%)` }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
    </div>
  );
}
