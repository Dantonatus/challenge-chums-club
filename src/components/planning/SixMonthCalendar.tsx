import { SixMonthWindow, getSixMonthDates, getSixMonthDateRange, MilestoneWithClient, Client } from '@/lib/planning/types';
import { ClientBadge } from './ClientBadge';
import { ClientPeriodBar } from './ClientPeriodBar';
import { format, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SixMonthCalendarProps {
  sixMonth: SixMonthWindow;
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
const ROW_HEIGHT_EXPANDED = 160;

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

function SixMonthClientRow({ 
  client, milestones, rowHeight, monthDates, viewRange, 
  onClientClick, onMilestoneClick, showLabels 
}: ClientRowProps) {
  return (
    <div 
      className="grid grid-cols-[160px_1fr] border-b last:border-b-0 group hover:bg-muted/5 transition-colors"
      style={{ height: `${rowHeight}px` }}
    >
      <div 
        className="p-2 border-r flex items-center"
        style={{ borderLeftColor: client.color, borderLeftWidth: '4px' }}
      >
        <ClientBadge client={client} compact onClick={() => onClientClick(client)} />
      </div>

      <div className="relative px-1">
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

        <div className="relative h-full flex items-center overflow-visible">
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

export function SixMonthCalendar({ sixMonth, clientData, onMilestoneClick, onClientClick, showLabels = false }: SixMonthCalendarProps) {
  const monthDates = getSixMonthDates(sixMonth);
  const viewRange = getSixMonthDateRange(sixMonth);

  const rowHeight = showLabels ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COMPACT;
  const needsScroll = clientData.length > MAX_VISIBLE_CLIENTS;

  if (clientData.length === 0) {
    return null;
  }

  const renderClientRows = () => (
    <>
      {clientData.map(({ client, milestones }) => (
        <SixMonthClientRow 
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
        <div className="grid grid-cols-[160px_repeat(6,1fr)] border-b bg-muted/30 sticky top-0 z-20">
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
              {format(date, 'MMM yyyy', { locale: de })}
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

        {/* Today indicator */}
        <TodayLine sixMonth={sixMonth} clientColumnWidth={160} />
      </div>
    </div>
  );
}

function TodayLine({ sixMonth, clientColumnWidth }: { sixMonth: SixMonthWindow; clientColumnWidth: number }) {
  const today = new Date();
  const monthDates = getSixMonthDates(sixMonth);
  
  const monthIndex = monthDates.findIndex(d => 
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
  );
  
  if (monthIndex === -1) return null;

  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const percentInMonth = (dayOfMonth / daysInMonth) * 100;

  const monthWidth = 100 / 6;
  const leftPercent = (monthIndex * monthWidth) + (percentInMonth * monthWidth / 100);

  return (
    <div 
      className="absolute top-0 bottom-0 w-0.5 bg-primary z-5 pointer-events-none"
      style={{ left: `calc(${clientColumnWidth}px + (100% - ${clientColumnWidth}px) * ${leftPercent} / 100)` }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
    </div>
  );
}
