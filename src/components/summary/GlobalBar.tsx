import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDateRange } from "@/contexts/DateRangeContext";
import { weekRangeLabel } from "@/lib/date";
import { Download, Save, GitCompare, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { TimelineSlider } from "@/components/charts/TimelineSlider";
import { startOfISOWeek, endOfISOWeek } from "@/lib/date";
import { format, eachWeekOfInterval } from "date-fns";

interface GlobalBarProps {
  lang: 'de' | 'en';
  onExport?: () => void;
  onSaveView?: () => void;
  onCompareToggle?: () => void;
  compareMode?: boolean;
}

export function GlobalBar({ 
  lang, 
  onExport, 
  onSaveView, 
  onCompareToggle, 
  compareMode = false 
}: GlobalBarProps) {
  const { start, end, setRange, minDate, maxDate } = useDateRange();
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const t = {
    de: {
      title: "Übersicht",
      export: "Exportieren",
      saveView: "Ansicht speichern",
      compare: "Vergleichen",
      help: "Hilfe",
      helpTooltip: "← → für 1 Woche, Shift + ← → für 4 Wochen"
    },
    en: {
      title: "Summary",
      export: "Export",
      saveView: "Save View",
      compare: "Compare",
      help: "Help",
      helpTooltip: "← → for 1 week, Shift + ← → for 4 weeks"
    }
  };

  // Generate weeks array for the slider
  const weeks = eachWeekOfInterval(
    { start: startOfISOWeek(minDate), end: endOfISOWeek(maxDate) },
    { weekStartsOn: 1 }
  );

  const selectedRange: [number, number] = [
    weeks.findIndex(week => 
      startOfISOWeek(week).getTime() <= start.getTime() && 
      start.getTime() <= endOfISOWeek(week).getTime()
    ),
    weeks.findIndex(week => 
      startOfISOWeek(week).getTime() <= end.getTime() && 
      end.getTime() <= endOfISOWeek(week).getTime()
    )
  ];

  const debouncedRangeChange = useCallback((range: [number, number]) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      const startWeek = weeks[range[0]];
      const endWeek = weeks[range[1]];
      if (startWeek && endWeek) {
        setRange({
          start: startOfISOWeek(startWeek),
          end: endOfISOWeek(endWeek)
        });
      }
    }, 250);
    
    setDebounceTimer(timer);
  }, [debounceTimer, weeks, setRange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      
      const isShift = e.shiftKey;
      const step = isShift ? 4 : 1; // 4 weeks with Shift, 1 week without
      
      let newRange = [...selectedRange] as [number, number];
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        newRange = [
          Math.max(0, selectedRange[0] - step),
          Math.max(step - 1, selectedRange[1] - step)
        ];
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        newRange = [
          Math.min(weeks.length - step, selectedRange[0] + step),
          Math.min(weeks.length - 1, selectedRange[1] + step)
        ];
      }
      
      if (newRange[0] !== selectedRange[0] || newRange[1] !== selectedRange[1]) {
        debouncedRangeChange(newRange);
      }
    };

    // Only add keyboard listener if user prefers motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedRange, weeks.length, debouncedRangeChange]);

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const rangeBadge = weekRangeLabel(start, end, lang);

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Title + Range Badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t[lang].title}
            </h1>
            <Badge variant="secondary" className="text-xs font-normal">
              {rangeBadge}
            </Badge>
          </div>

          {/* Center: Date Range Slider */}
          <div className="flex-1 max-w-md">
            <TimelineSlider
              weeks={weeks}
              selectedRange={selectedRange}
              onRangeChange={debouncedRangeChange}
              lang={lang}
            />
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExport}
                    className="hover-scale"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t[lang].export}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t[lang].export}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSaveView}
                    className="hover-scale"
                  >
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t[lang].saveView}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t[lang].saveView}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={compareMode ? "default" : "ghost"}
                    size="sm"
                    onClick={onCompareToggle}
                    className="hover-scale"
                  >
                    <GitCompare className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t[lang].compare}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t[lang].compare}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover-scale"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t[lang].helpTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}