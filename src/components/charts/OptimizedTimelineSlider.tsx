import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { format, getWeek } from "date-fns";
import { de, enUS } from "date-fns/locale";

interface OptimizedTimelineSliderProps {
  weeks: Date[];
  selectedRange: [number, number];
  onRangeChange: (range: [number, number]) => void;
  lang: 'de' | 'en';
}

export function OptimizedTimelineSlider({ weeks, selectedRange, onRangeChange, lang }: OptimizedTimelineSliderProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [tempRange, setTempRange] = useState<[number, number] | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const locale = lang === 'de' ? de : enUS;

  // Use temp range while dragging, actual range when not
  const displayRange = tempRange || selectedRange;

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
    setTempRange(selectedRange);
  }, [selectedRange]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !tempRange) return;
    
    const position = getPositionFromEvent(event);
    const weekIndex = getWeekFromPosition(position);
    
    let newRange: [number, number];
    
    if (isDragging === 'start') {
      newRange = [weekIndex, Math.max(weekIndex, tempRange[1])];
    } else {
      newRange = [Math.min(tempRange[0], weekIndex), weekIndex];
    }
    
    setTempRange(newRange);
  }, [isDragging, getPositionFromEvent, getWeekFromPosition, tempRange]);

  const handleMouseUp = useCallback(() => {
    if (tempRange) {
      onRangeChange(tempRange);
      setTempRange(null);
    }
    setIsDragging(null);
  }, [tempRange, onRangeChange]);

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

  const { startPosition, endPosition, trackWidth } = useMemo(() => {
    const start = (displayRange[0] / (weeks.length - 1)) * 100;
    const end = (displayRange[1] / (weeks.length - 1)) * 100;
    return {
      startPosition: start,
      endPosition: end,
      trackWidth: end - start
    };
  }, [displayRange, weeks.length]);

  const formatWeekLabel = useCallback((weekIndex: number) => {
    if (weekIndex >= weeks.length) return '';
    const week = weeks[weekIndex];
    const weekNumber = getWeek(week, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    return `${lang === 'de' ? 'KW' : 'Week'} ${weekNumber}`;
  }, [weeks, lang]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatWeekLabel(displayRange[0])}</span>
        <span>{formatWeekLabel(displayRange[1])}</span>
      </div>
      
      <div
        ref={sliderRef}
        className="timeline-slider group relative cursor-pointer"
        style={{ height: '12px' }}
      >
        {/* Track Background */}
        <div className="absolute inset-0 bg-muted rounded-full" />
        
        {/* Active Track */}
        <div
          className="timeline-track absolute top-0 h-full bg-primary rounded-full transition-all duration-75"
          style={{
            left: `${startPosition}%`,
            width: `${trackWidth}%`,
          }}
        />
        
        {/* Start Thumb */}
        <div
          className={`timeline-thumb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background shadow-md cursor-grab transition-all duration-75 hover:scale-110 ${
            isDragging === 'start' ? 'scale-125 cursor-grabbing' : ''
          }`}
          style={{ left: `${startPosition}%` }}
          onMouseDown={handleMouseDown('start')}
          onTouchStart={handleMouseDown('start') as any}
        />
        
        {/* End Thumb */}
        <div
          className={`timeline-thumb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background shadow-md cursor-grab transition-all duration-75 hover:scale-110 ${
            isDragging === 'end' ? 'scale-125 cursor-grabbing' : ''
          }`}
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