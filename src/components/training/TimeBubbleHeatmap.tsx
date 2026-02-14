import { useMemo, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrainingCheckin } from '@/lib/training/types';
import { bubbleHeatmapData } from '@/lib/training/analytics';

interface Props { checkins: TrainingCheckin[] }

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = 5; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 23) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

export default function TimeBubbleHeatmap({ checkins }: Props) {
  const data = useMemo(() => bubbleHeatmapData(checkins), [checkins]);
  const slots = useMemo(() => generateSlots(), []);

  const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data]);

  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(d => map.set(`${d.day}|${d.slot}`, d.count));
    return map;
  }, [data]);

  // Find range of slots that actually have data to trim empty edges
  const activeSlots = useMemo(() => {
    const slotsWithData = new Set(data.map(d => d.slot));
    let first = 0, last = slots.length - 1;
    while (first < slots.length && !slotsWithData.has(slots[first])) first++;
    while (last >= 0 && !slotsWithData.has(slots[last])) last--;
    // Add 1 slot padding on each side
    first = Math.max(0, first - 2);
    last = Math.min(slots.length - 1, last + 2);
    return slots.slice(first, last + 1);
  }, [slots, data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-lg font-semibold">Trainingszeiten-Heatmap</div>
        <p className="text-xs text-muted-foreground">Wochentag × Uhrzeit (30-Min-Raster) – größere Bubble = mehr Check-ins</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[600px]">
            {/* Header row with time slots */}
            <div className="flex items-end mb-1" style={{ paddingLeft: 32 }}>
              {activeSlots.map((slot, i) => (
                <div
                  key={slot}
                  className="text-[10px] text-muted-foreground text-center flex-1"
                  style={{ minWidth: 28 }}
                >
                  {i % 2 === 0 ? slot : ''}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <TooltipProvider delayDuration={100}>
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-0 h-9">
                  <div className="w-8 text-xs font-medium text-muted-foreground shrink-0">{day}</div>
                  {activeSlots.map(slot => {
                    const count = lookup.get(`${day}|${slot}`) || 0;
                    const ratio = count / maxCount;
                    const size = count > 0 ? Math.max(8, ratio * 28) : 0;

                    return (
                      <div
                        key={slot}
                        className="flex-1 flex items-center justify-center"
                        style={{ minWidth: 28, height: 32 }}
                      >
                        {count > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="rounded-full transition-transform hover:scale-125 cursor-default"
                                style={{
                                  width: size,
                                  height: size,
                                  backgroundColor: `hsl(var(--primary) / ${0.25 + ratio * 0.75})`,
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <span className="font-semibold">{count}×</span> {day} {slot}–{
                                (() => {
                                  const [h, m] = slot.split(':').map(Number);
                                  const nm = m + 30;
                                  return `${String(nm >= 60 ? h + 1 : h).padStart(2, '0')}:${String(nm % 60).padStart(2, '0')}`;
                                })()
                              }
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
