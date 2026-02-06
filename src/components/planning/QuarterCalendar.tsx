import { useMemo } from 'react';
import { Quarter, getQuarterMonths, MilestoneWithClient, Client } from '@/lib/planning/types';
import { MilestoneCard } from './MilestoneCard';
import { ClientBadge } from './ClientBadge';
import { format, isToday, isPast, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface QuarterCalendarProps {
  quarter: Quarter;
  clientData: Array<{
    client: Client;
    milestones: MilestoneWithClient[];
  }>;
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
}

export function QuarterCalendar({ quarter, clientData, onMilestoneClick }: QuarterCalendarProps) {
  const months = getQuarterMonths(quarter);
  const monthDates = months.map(m => new Date(quarter.year, m, 1));

  // Group milestones by client and month
  const grid = useMemo(() => {
    return clientData.map(({ client, milestones }) => ({
      client,
      monthMilestones: monthDates.map(monthDate => 
        milestones.filter(m => isSameMonth(new Date(m.date), monthDate))
      ),
    }));
  }, [clientData, monthDates]);

  if (clientData.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Month headers */}
      <div className="grid grid-cols-[180px_1fr_1fr_1fr] border-b bg-muted/30">
        <div className="p-3 border-r" />
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
      {grid.map(({ client, monthMilestones }) => (
        <div 
          key={client.id} 
          className="grid grid-cols-[180px_1fr_1fr_1fr] border-b last:border-b-0 group hover:bg-muted/20 transition-colors"
        >
          {/* Client column */}
          <div 
            className="p-3 border-r flex items-start"
            style={{ borderLeftColor: client.color, borderLeftWidth: '4px' }}
          >
            <ClientBadge client={client} />
          </div>

          {/* Month columns */}
          {monthMilestones.map((milestones, monthIndex) => (
            <div 
              key={monthIndex} 
              className={cn(
                "p-2 border-r last:border-r-0 min-h-[80px] space-y-2",
                isSameMonth(monthDates[monthIndex], new Date()) && "bg-primary/5"
              )}
            >
              {milestones
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(milestone => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    onClick={() => onMilestoneClick(milestone)}
                    compact
                  />
                ))
              }
            </div>
          ))}
        </div>
      ))}

      {/* Today indicator line */}
      <TodayLine quarter={quarter} />
    </div>
  );
}

function TodayLine({ quarter }: { quarter: Quarter }) {
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

  // Position calculation: 180px for client col + (monthIndex * colWidth) + percentInMonth of colWidth
  const leftPercent = `calc(180px + ${monthIndex * 33.33}% + ${percentInMonth * 0.3333}%)`;

  return (
    <div 
      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
      style={{ left: leftPercent }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
    </div>
  );
}
