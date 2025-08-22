import { useState, useCallback, useRef, useEffect } from "react";
import { format, getWeek } from "date-fns";
import { de, enUS } from "date-fns/locale";

interface TimelineSliderProps {
  weeks: Date[];
  selectedRange: [number, number];
  onRangeChange: (range: [number, number]) => void;
  lang: 'de' | 'en';
}

export function TimelineSlider({ weeks, selectedRange, onRangeChange, lang }: TimelineSliderProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const locale = lang === 'de' ? de : enUS;

  const getPositionFromEvent = useCallback((event: MouseEvent | TouchEvent) => {
    if (!sliderRef.current) return 0;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const position = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, position));
  }, []);

  const getWeekFromPosition = useCallback((position: number) => {
    return Math.round(position * (weeks.length - 1));
  }, [weeks.length]);

  const handleMouseDown = useCallback((type: 'start' | 'end') => (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(type);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    
    const position = getPositionFromEvent(event);
    const weekIndex = getWeekFromPosition(position);
    
    if (isDragging === 'start') {
      onRangeChange([weekIndex, Math.max(weekIndex, selectedRange[1])]);
    } else {
      onRangeChange([Math.min(selectedRange[0], weekIndex), weekIndex]);
    }
  }, [isDragging, getPositionFromEvent, getWeekFromPosition, onRangeChange, selectedRange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove as any);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove as any);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const startPosition = (selectedRange[0] / (weeks.length - 1)) * 100;
  const endPosition = (selectedRange[1] / (weeks.length - 1)) * 100;
  const trackWidth = endPosition - startPosition;

  const formatWeekLabel = (weekIndex: number) => {
    if (weekIndex >= weeks.length) return '';
    const week = weeks[weekIndex];
    const weekNumber = getWeek(week, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    return `${lang === 'de' ? 'KW' : 'Week'} ${weekNumber}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatWeekLabel(selectedRange[0])}</span>
        <span>{formatWeekLabel(selectedRange[1])}</span>
      </div>
      
      <div
        ref={sliderRef}
        className="timeline-slider group"
        style={{ height: '12px' }}
      >
        {/* Track Background */}
        <div className="absolute inset-0 bg-muted rounded-full" />
        
        {/* Active Track */}
        <div
          className="timeline-track"
          style={{
            left: `${startPosition}%`,
            width: `${trackWidth}%`,
          }}
        />
        
        {/* Start Thumb */}
        <div
          className="timeline-thumb"
          style={{ left: `${startPosition}%` }}
          onMouseDown={handleMouseDown('start')}
          onTouchStart={handleMouseDown('start') as any}
        />
        
        {/* End Thumb */}
        <div
          className="timeline-thumb"
          style={{ left: `${endPosition}%` }}
          onMouseDown={handleMouseDown('end')}
          onTouchStart={handleMouseDown('end') as any}
        />
        
        {/* Week Markers */}
        {weeks.map((_, index) => (
          <div
            key={index}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-chart-axis rounded-full opacity-30"
            style={{ left: `${(index / (weeks.length - 1)) * 100}%` }}
          />
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-chart-axis">
        <span>{formatWeekLabel(0)}</span>
        <span>{formatWeekLabel(weeks.length - 1)}</span>
      </div>
    </div>
  );
}