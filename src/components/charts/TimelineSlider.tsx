import { useState, useCallback, useRef, useEffect } from "react";
import { isoWeekOf } from "@/lib/date";

interface TimelineSliderProps {
  weeks: Date[];
  selectedRange: [number, number];
  onRangeChange: (range: [number, number]) => void;
  lang: 'de' | 'en';
  minGap?: number;
}

export function TimelineSlider({ weeks, selectedRange, onRangeChange, lang, minGap = 0 }: TimelineSliderProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [tempRange, setTempRange] = useState<[number, number] | null>(null);
  const [focusedThumb, setFocusedThumb] = useState<'start' | 'end' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const startThumbRef = useRef<HTMLDivElement>(null);
  const endThumbRef = useRef<HTMLDivElement>(null);

  // Use temp range while dragging, actual range otherwise
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
    if (!isDragging) return;
    
    const position = getPositionFromEvent(event);
    const weekIndex = getWeekFromPosition(position);
    
    setTempRange(prev => {
      if (!prev) return selectedRange;
      
      let newRange: [number, number];
      if (isDragging === 'start') {
        const maxStart = Math.max(0, prev[1] - minGap);
        const clampedStart = Math.max(0, Math.min(maxStart, weekIndex));
        newRange = [clampedStart, prev[1]];
      } else {
        const minEnd = Math.min(weeks.length - 1, prev[0] + minGap);
        const clampedEnd = Math.min(weeks.length - 1, Math.max(minEnd, weekIndex));
        newRange = [prev[0], clampedEnd];
      }
      
      return newRange;
    });
  }, [isDragging, getPositionFromEvent, getWeekFromPosition, selectedRange]);

  const handleMouseUp = useCallback(() => {
    if (tempRange) {
      onRangeChange(tempRange);
    }
    setIsDragging(null);
    setTempRange(null);
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

  // Handle disabled state
  if (weeks.length < 2) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center text-xs text-muted-foreground">
          <span>{lang === 'de' ? 'Keine Wochen verfügbar' : 'No weeks available'}</span>
        </div>
        <div className="relative w-full h-3 bg-muted/50 rounded-full">
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {lang === 'de' ? 'Mindestens 2 Wochen erforderlich' : 'At least 2 weeks required'}
          </div>
        </div>
      </div>
    );
  }

  // Normalize range to valid bounds
  const normalizedRange: [number, number] = [
    Math.max(0, Math.min(displayRange[0], weeks.length - 1)),
    Math.max(0, Math.min(displayRange[1], weeks.length - 1))
  ];
  const handleKeyDown = useCallback((event: React.KeyboardEvent, thumb: 'start' | 'end') => {
    let delta = 0;
    
    switch (event.key) {
      case 'ArrowLeft':
        delta = event.shiftKey ? -4 : -1;
        break;
      case 'ArrowRight':
        delta = event.shiftKey ? 4 : 1;
        break;
      case 'Home':
        delta = thumb === 'start' ? -normalizedRange[0] : -normalizedRange[1];
        break;
      case 'End':
        delta = thumb === 'start' 
          ? (weeks.length - 1 - minGap) - normalizedRange[0]
          : (weeks.length - 1) - normalizedRange[1];
        break;
      default:
        return;
    }
    
    event.preventDefault();
    
    let newRange: [number, number];
    if (thumb === 'start') {
      const newStart = Math.max(0, Math.min(normalizedRange[1] - minGap, normalizedRange[0] + delta));
      newRange = [newStart, normalizedRange[1]];
    } else {
      const newEnd = Math.min(weeks.length - 1, Math.max(normalizedRange[0] + minGap, normalizedRange[1] + delta));
      newRange = [normalizedRange[0], newEnd];
    }
    
    onRangeChange(newRange);
  }, [normalizedRange, weeks.length, minGap, onRangeChange]);

  const startPosition = weeks.length > 1 ? (normalizedRange[0] / (weeks.length - 1)) * 100 : 0;
  const endPosition = weeks.length > 1 ? (normalizedRange[1] / (weeks.length - 1)) * 100 : 100;
  const trackWidth = endPosition - startPosition;

  const formatWeekLabel = useCallback((weekIndex: number): string => {
    if (weekIndex < 0 || weekIndex >= weeks.length || !weeks[weekIndex]) {
      return '';
    }
    
    try {
      const week = weeks[weekIndex];
      const weekNumber = isoWeekOf(week);
      
      // Validate that weekNumber is a valid number
      if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
        console.warn('Invalid week number:', weekNumber, 'for date:', week);
        return '';
      }
      
      return `${lang === 'de' ? 'KW' : 'Week'} ${weekNumber}`;
    } catch (error) {
      console.error('Error formatting week label:', error);
      return '';
    }
  }, [weeks, lang]);

  return (
    <div className="space-y-4">
      {/* Top labels showing selected range */}
      <div className="flex justify-between text-xs font-medium text-foreground">
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground">{lang === 'de' ? 'Start:' : 'Start:'}</span>
          {formatWeekLabel(normalizedRange[0])}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground">{lang === 'de' ? 'Ende:' : 'End:'}</span>
          {formatWeekLabel(normalizedRange[1])}
        </span>
      </div>
      
      <div
        ref={sliderRef}
        className="timeline-slider group"
        style={{ height: '16px' }}
        role="slider"
        aria-label={lang === 'de' ? 'Wochen-Bereich Auswahl' : 'Week range selection'}
      >
        {/* Track Background */}
        <div className="absolute inset-0 bg-muted rounded-full" />
        
        {/* Active Track with gradient */}
        <div
          className="timeline-track"
          style={{
            left: `${startPosition}%`,
            width: `${trackWidth}%`,
          }}
        />
        
        {/* Week Markers */}
        {weeks.map((_, index) => (
          <div
            key={index}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-chart-axis rounded-full opacity-40 group-hover:opacity-60 transition-opacity"
            style={{ left: `${weeks.length > 1 ? (index / (weeks.length - 1)) * 100 : 50}%` }}
          />
        ))}
        
        {/* Start Thumb */}
        <div
          ref={startThumbRef}
          className={`timeline-thumb ${focusedThumb === 'start' ? 'ring-2 ring-ring ring-offset-2' : ''}`}
          style={{ left: `${startPosition}%` }}
          onMouseDown={handleMouseDown('start')}
          onTouchStart={handleMouseDown('start') as any}
          onFocus={() => setFocusedThumb('start')}
          onBlur={() => setFocusedThumb(null)}
          onKeyDown={(e) => handleKeyDown(e, 'start')}
          tabIndex={0}
          role="slider"
          aria-label={`${lang === 'de' ? 'Start Woche' : 'Start week'}: ${formatWeekLabel(normalizedRange[0])}`}
          aria-valuemin={0}
          aria-valuemax={weeks.length - 1}
          aria-valuenow={normalizedRange[0]}
        />
        
        {/* End Thumb */}
        <div
          ref={endThumbRef}
          className={`timeline-thumb ${focusedThumb === 'end' ? 'ring-2 ring-ring ring-offset-2' : ''}`}
          style={{ left: `${endPosition}%` }}
          onMouseDown={handleMouseDown('end')}
          onTouchStart={handleMouseDown('end') as any}
          onFocus={() => setFocusedThumb('end')}
          onBlur={() => setFocusedThumb(null)}
          onKeyDown={(e) => handleKeyDown(e, 'end')}
          tabIndex={0}
          role="slider"
          aria-label={`${lang === 'de' ? 'End Woche' : 'End week'}: ${formatWeekLabel(normalizedRange[1])}`}
          aria-valuemin={0}
          aria-valuemax={weeks.length - 1}
          aria-valuenow={normalizedRange[1]}
        />
      </div>
      
      {/* Bottom labels showing first and last week */}
      <div className="flex justify-between text-xs text-chart-axis">
        <span>{formatWeekLabel(0)}</span>
        <span>{formatWeekLabel(weeks.length - 1)}</span>
      </div>
    </div>
  );
}