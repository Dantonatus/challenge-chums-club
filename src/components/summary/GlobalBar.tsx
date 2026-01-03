import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateRange } from "@/contexts/DateRangeContext";
import { weekRangeLabel } from "@/lib/date";
import { Download, Save, GitCompare, HelpCircle, ChevronDown, Trash2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { TimelineSlider } from "@/components/charts/TimelineSlider";
import { startOfISOWeek, endOfISOWeek } from "@/lib/date";
import { format, eachWeekOfInterval, startOfYear, endOfYear } from "date-fns";
import { SaveViewModal } from "./SaveViewModal";
import { CompareBar } from "./CompareBar";
import { motion, AnimatePresence } from "framer-motion";
import { exportToCSV } from "@/lib/csvExport";
import { getSavedViews, deleteSavedView, SavedView } from "@/lib/views";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface GlobalBarProps {
  lang: 'de' | 'en';
  compareMode?: boolean;
  onCompareToggle?: () => void;
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
  onFiltersChange?: (filters: any) => void;
  onViewApplied?: (view: SavedView) => void;
}

export function GlobalBar({ 
  lang, 
  compareMode = false,
  onCompareToggle,
  filters = { participants: [], challengeTypes: [], groups: [] },
  onFiltersChange,
  onViewApplied
}: GlobalBarProps) {
  const { start, end, setRange, minDate, maxDate, preset } = useDateRange();
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [saveViewModalOpen, setSaveViewModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  // Year selector state
  const [selectedYear, setSelectedYear] = useState(start.getFullYear());
  
  // Only 2026 and 2027 available
  const availableYears = useMemo(() => [2026, 2027], []);
  
  const t = {
    de: {
      title: "Übersicht",
      export: "PDF Exportieren",
      saveView: "Ansicht speichern",
      compare: "Vergleichen",
      help: "Hilfe",
      helpTooltip: "← → für 1 Woche, Shift + ← → für 4 Wochen",
      savedViews: "Gespeicherte Ansichten",
      noSavedViews: "Keine gespeicherten Ansichten",
      deleteView: "Löschen",
      exportSuccess: "PDF erfolgreich exportiert",
      exportError: "Fehler beim Exportieren",
      viewDeleted: "Ansicht gelöscht",
      viewDeleteError: "Fehler beim Löschen"
    },
    en: {
      title: "Summary",
      export: "Export PDF",
      saveView: "Save View", 
      compare: "Compare",
      help: "Help",
      helpTooltip: "← → for 1 week, Shift + ← → for 4 weeks",
      savedViews: "Saved Views",
      noSavedViews: "No saved views",
      deleteView: "Delete",
      exportSuccess: "PDF exported successfully",
      exportError: "Export failed",
      viewDeleted: "View deleted",
      viewDeleteError: "Failed to delete view"
    }
  };

  // Fetch saved views
  const { data: savedViews, refetch: refetchViews } = useQuery({
    queryKey: ['saved-views'],
    queryFn: getSavedViews,
    staleTime: 30000 // 30 seconds
  });

  // Generate weeks array for the slider based on selected year
  const weeks = useMemo(() => {
    const yearStart = startOfISOWeek(new Date(selectedYear, 0, 1));
    const yearEnd = endOfISOWeek(new Date(selectedYear, 11, 31));
    return eachWeekOfInterval(
      { start: yearStart, end: yearEnd },
      { weekStartsOn: 1 }
    );
  }, [selectedYear]);

  // Update selected year when date range changes externally
  useEffect(() => {
    if (start.getFullYear() !== selectedYear) {
      setSelectedYear(start.getFullYear());
    }
  }, [start]);

  // Handle year change
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    // Set range to full year
    const yearStartDate = startOfISOWeek(new Date(year, 0, 1));
    const yearEndDate = endOfISOWeek(new Date(year, 11, 31));
    setRange({ start: yearStartDate, end: yearEndDate });
  }, [setRange]);

  const goToPrevYear = useCallback(() => {
    handleYearChange(selectedYear - 1);
  }, [selectedYear, handleYearChange]);

  const goToNextYear = useCallback(() => {
    handleYearChange(selectedYear + 1);
  }, [selectedYear, handleYearChange]);

  // Map current context range to slider indices robustly (handles out-of-domain dates)
  const getIndicesForRange = useCallback((weeksArr: Date[], s: Date, e: Date): [number, number] => {
    // First index whose week end is on/after start
    let sIdx = weeksArr.findIndex(w => endOfISOWeek(w).getTime() >= s.getTime());
    if (sIdx < 0) sIdx = 0;

    // Last index whose week start is on/before end
    let afterEndIdx = weeksArr.findIndex(w => startOfISOWeek(w).getTime() > e.getTime());
    let eIdx = afterEndIdx === -1 ? weeksArr.length - 1 : Math.max(sIdx, afterEndIdx - 1);

    // Ensure ordering
    if (eIdx < sIdx) eIdx = sIdx;
    return [sIdx, eIdx];
  }, []);

  const selectedRange: [number, number] = getIndicesForRange(weeks, start, end);

  // Ensure valid range within bounds
  const normalizedRange: [number, number] = [
    Math.max(0, Math.min(selectedRange[0], weeks.length - 1)),
    Math.max(0, Math.min(selectedRange[1], weeks.length - 1))
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
    }, 150); // Reduced debounce for more responsive feel
    
    setDebounceTimer(timer);
  }, [debounceTimer, weeks, setRange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      
      const isShift = e.shiftKey;
      const step = isShift ? 4 : 1;
      
      let newRange = [...selectedRange] as [number, number];
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        newRange = [
          Math.max(0, normalizedRange[0] - step),
          Math.max(step - 1, normalizedRange[1] - step)
        ];
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        newRange = [
          Math.min(weeks.length - step, normalizedRange[0] + step),
          Math.min(weeks.length - 1, normalizedRange[1] + step)
        ];
      } else if (e.key === 'Enter' && e.ctrlKey) {
        // Ctrl+Enter to export
        handleExport();
      }
      
      if (newRange[0] !== normalizedRange[0] || newRange[1] !== normalizedRange[1]) {
        debouncedRangeChange(newRange);
      }
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [normalizedRange, weeks.length, debouncedRangeChange]);

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToCSV({
        start,
        end,
        filters: filters!,
        lang
      });
      toast({
        title: t[lang].exportSuccess,
        description: `${weekRangeLabel(start, end, lang)}`,
      });
    } catch (error) {
      toast({
        title: t[lang].exportError,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteView = async (viewId: string, viewName: string) => {
    try {
      await deleteSavedView(viewId);
      await refetchViews();
      toast({
        title: t[lang].viewDeleted,
        description: `"${viewName}" ${lang === 'de' ? 'wurde gelöscht' : 'has been deleted'}`,
      });
    } catch (error) {
      toast({
        title: t[lang].viewDeleteError,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const handleApplyView = (view: SavedView) => {
    const startDate = new Date(view.dateRange.start);
    const endDate = new Date(view.dateRange.end);
    
    setRange({ start: startDate, end: endDate });
    onFiltersChange?.(view.filters);
    onViewApplied?.(view);
    
    toast({
      title: lang === 'de' ? 'Ansicht angewendet' : 'View applied',
      description: `"${view.name}"`,
    });
  };

  const rangeBadge = weekRangeLabel(start, end, lang);

  return (
    <>
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Title + Year Selector */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t[lang].title}
              </h1>
              
              {/* Year Selector */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={goToPrevYear} className="h-7 w-7">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(v) => handleYearChange(parseInt(v))}
                >
                  <SelectTrigger className="w-[80px] h-7 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="ghost" size="icon" onClick={goToNextYear} className="h-7 w-7">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Badge variant="secondary" className="text-xs font-normal">
                {rangeBadge}
              </Badge>
            </div>

            {/* Center: Date Range Slider */}
            <div className="flex-1 max-w-lg">
              <TimelineSlider
                weeks={weeks}
                selectedRange={normalizedRange}
                onRangeChange={debouncedRangeChange}
                lang={lang}
                minGap={0}
              />
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Export Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExport}
                      disabled={isExporting}
                      className="hover-scale transition-all duration-200"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">
                        {isExporting ? '...' : t[lang].export}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t[lang].export}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Save View Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSaveViewModalOpen(true)}
                      className="hover-scale transition-all duration-200"
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

              {/* Saved Views Dropdown */}
              {savedViews && savedViews.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover-scale transition-all duration-200"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-64 bg-background/95 backdrop-blur-sm border-border/50 shadow-xl"
                  >
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {t[lang].savedViews}
                    </div>
                    <DropdownMenuSeparator />
                    {savedViews.map((view) => (
                      <DropdownMenuItem
                        key={view.id}
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleApplyView(view)}
                      >
                        <div className="flex items-center gap-2">
                          {view.isDefault && <Star className="w-3 h-3 text-amber-500" />}
                          <span className="text-sm">{view.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteView(view.id, view.name);
                          }}
                          className="h-6 w-6 p-0 hover:bg-destructive/20"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Compare Mode Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={compareMode ? "default" : "ghost"}
                      size="sm"
                      onClick={onCompareToggle}
                      className="hover-scale transition-all duration-200"
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

              {/* Help Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover-scale transition-all duration-200"
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

        {/* Compare Bar */}
        <AnimatePresence>
          {compareMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-border/30"
            >
              <CompareBar
                participants={[]} // Will be populated by the component itself
                onSelectionChange={() => {}} // Handled internally
                lang={lang}
                onClose={() => onCompareToggle?.()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save View Modal */}
      <SaveViewModal
        open={saveViewModalOpen}
        onClose={() => setSaveViewModalOpen(false)}
        currentFilters={{
          participants: filters?.participants || [],
          challengeTypes: filters?.challengeTypes || [],
          groups: filters?.groups || []
        }}
        currentDateRange={{ start, end }}
        lang={lang}
        onViewSaved={() => refetchViews()}
      />
    </>
  );
}