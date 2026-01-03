import { useMemo, useState, useEffect, useRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDateRange } from "@/contexts/DateRangeContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const dict = {
  de: {
    title: "Zeitraum",
    presets: "Voreinstellungen",
    appliesNote: "Gilt für alle Kacheln und Charts.",
    startThumb: "Startdatum",
    endThumb: "Enddatum",
    presetsList: ["30d", "90d", "6M", "Jahr"],
  },
  en: {
    title: "Date Range",
    presets: "Presets",
    appliesNote: "Applies to all cards and charts.",
    startThumb: "Start date",
    endThumb: "End date",
    presetsList: ["30d", "90d", "6M", "Year"],
  }
} as const;

// Only 2026 and 2027 available
const AVAILABLE_YEARS = [2026, 2027];

const MS_DAY = 86400000;
function daysSinceEpochLocal(d: Date) {
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(localMidnight.getTime() / MS_DAY);
}
function dateFromLocalDayNumber(n: number) {
  const base = new Date(1970, 0, 1);
  base.setDate(base.getDate() + n);
  return base;
}
function formatPPP(d: Date) {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function endOfLocalDayFromDayNumber(n: number) {
  const d = dateFromLocalDayNumber(n);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function DateRangeBar({ className, sticky = true }: { className?: string; sticky?: boolean }) {
  const { start, end, minDate, maxDate, now, setRange } = useDateRange();
  const lang = (navigator.language?.startsWith("de") ? "de" : "en") as keyof typeof dict;
  const t = dict[lang];

  // Year selector state
  const [selectedYear, setSelectedYear] = useState(start.getFullYear());

  const minDays = useMemo(() => daysSinceEpochLocal(minDate), [minDate]);
  const maxDays = useMemo(() => daysSinceEpochLocal(maxDate), [maxDate]);
  const [local, setLocal] = useState<[number, number]>([daysSinceEpochLocal(start), daysSinceEpochLocal(end)]);
  const [active, setActive] = useState<"s" | "e" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const showTips = dragging || hover;

  // Keep local in sync with provider
  useEffect(() => {
    const startDays = daysSinceEpochLocal(start);
    const endDays = daysSinceEpochLocal(end);
    setLocal([startDays, endDays]);
    setSelectedYear(start.getFullYear());
  }, [start, end]);

  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Month ticks
  const monthTicks = useMemo(() => {
    const ticks: { pos: number; label: string }[] = [];
    const d = new Date(minDate);
    d.setDate(1);
    while (d <= maxDate) {
      const pos = ((daysSinceEpochLocal(d) - minDays) / (maxDays - minDays)) * 100;
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      ticks.push({ pos, label });
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }, [minDate, maxDate, minDays, maxDays]);

  // Handle year change - set full year
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    setRange({ start: yearStart, end: yearEnd });
  };

  const goToPrevYear = () => {
    const idx = AVAILABLE_YEARS.indexOf(selectedYear);
    if (idx > 0) {
      handleYearChange(AVAILABLE_YEARS[idx - 1]);
    }
  };

  const goToNextYear = () => {
    const idx = AVAILABLE_YEARS.indexOf(selectedYear);
    if (idx < AVAILABLE_YEARS.length - 1) {
      handleYearChange(AVAILABLE_YEARS[idx + 1]);
    }
  };

  const applyPreset = (key: string) => {
    const ref = now ?? new Date();
    const endDate = ref;
    let startDate: Date;
    
    if (key === "Jahr" || key === "Year") {
      // Full year preset
      handleYearChange(selectedYear);
      return;
    }
    
    switch (key) {
      case "30d": startDate = new Date(ref.getTime() - 30 * MS_DAY); break;
      case "90d": startDate = new Date(ref.getTime() - 90 * MS_DAY); break;
      case "6M": startDate = new Date(ref); startDate.setMonth(ref.getMonth() - 6); break;
      default: startDate = new Date(minDate);
    }
    const sVal = Math.max(daysSinceEpochLocal(startDate), minDays);
    const eVal = Math.min(daysSinceEpochLocal(endDate), maxDays);

    setLocal([sVal, eVal]);

    const todayN = daysSinceEpochLocal(ref);
    const loN = Math.min(sVal, eVal);
    const hiN = Math.max(sVal, eVal);

    const commitStart = dateFromLocalDayNumber(loN);
    const commitEnd = hiN === todayN ? new Date(ref) : endOfLocalDayFromDayNumber(hiN);

    setRange({ start: commitStart, end: commitEnd });
  };

  const [sDays, eDays] = local;
  const loDays = Math.min(sDays, eDays);
  const hiDays = Math.max(sDays, eDays);
  const loDate = dateFromLocalDayNumber(loDays);
  const hiDate = dateFromLocalDayNumber(hiDays);

  return (
    <Card className={cn("rounded-2xl shadow-lg border-0 bg-gradient-to-br from-background via-muted/10 to-background", sticky && "sticky top-0 z-30")}> 
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            📅 {t.title}
          </CardTitle>
          
          {/* Year Selector */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPrevYear} 
              disabled={AVAILABLE_YEARS.indexOf(selectedYear) === 0}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(v) => handleYearChange(parseInt(v))}
            >
              <SelectTrigger className="w-[80px] h-8 text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextYear}
              disabled={AVAILABLE_YEARS.indexOf(selectedYear) === AVAILABLE_YEARS.length - 1}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm font-medium tabular-nums bg-muted/50 px-3 py-1 rounded-lg">
            {formatPPP(loDate)} — {formatPPP(hiDate)}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {t.presetsList.map((key) => (
              <Button 
                key={key} 
                size="sm" 
                variant="outline" 
                className="h-8 px-3 rounded-lg hover:scale-105 transition-transform" 
                onClick={() => applyPreset(key)}
              >
                {key}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative pt-6 pb-3">
          <div className="absolute inset-x-0 top-0 h-5 pointer-events-none">
            <div className="relative h-full">
              {monthTicks.map((tick, i) => (
                <div key={i} className="absolute top-0 -translate-x-1/2 text-[10px] text-muted-foreground" style={{ left: `${tick.pos}%` }}>
                  <div className="w-px h-2 bg-border mx-auto" />
                  <div className="mt-1">{tick.label}</div>
                </div>
              ))}
            </div>
          </div>

          <SliderPrimitive.Root
            className="relative flex w-full select-none touch-none items-center"
            min={minDays}
            max={maxDays}
            step={1}
            minStepsBetweenThumbs={0}
            value={[sDays, eDays]}
            onValueChange={(v) => {
              const [a, b] = v as [number, number];
              setLocal(([s, e]) => {
                const clamp = (x: number) => Math.min(Math.max(x, minDays), maxDays);
                if (active === "s") return [clamp(a), e];
                if (active === "e") return [s, clamp(b)];
                return [s, e];
              });
            }}
            onValueCommit={(v) => {
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = undefined;
              }

              const [a, b] = v as [number, number];
              const refNow = now ?? new Date();
              const todayN = daysSinceEpochLocal(refNow);

              const startDays = active === "s" ? a : (active === "e" ? local[0] : Math.min(a, b));
              const endDays = active === "e" ? b : (active === "s" ? local[1] : Math.max(a, b));

              const startDate = startOfLocalDay(dateFromLocalDayNumber(startDays));
              const endDate = endDays === todayN ? new Date(refNow) : endOfLocalDay(dateFromLocalDayNumber(endDays));

              setRange({ start: startDate, end: endDate });
            }}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => { setDragging(false); setActive(null); }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            aria-label={t.title}
          >
            <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-muted/50 shadow-inner">
              <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-primary/80 shadow-sm" />
            </SliderPrimitive.Track>

            <SliderPrimitive.Thumb
              aria-label={t.startThumb}
              onPointerDown={() => setActive("s")}
              className={cn(
                "block h-7 w-7 rounded-full border-3 border-primary bg-background shadow-lg ring-offset-background transition-all duration-200",
                "hover:scale-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active === "s" && "scale-110 shadow-xl",
                dragging && active === "s" && "scale-125"
              )}
            />
            <SliderPrimitive.Thumb
              aria-label={t.endThumb}
              onPointerDown={() => setActive("e")}
              className={cn(
                "block h-7 w-7 rounded-full border-3 border-primary bg-background shadow-lg ring-offset-background transition-all duration-200",
                "hover:scale-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active === "e" && "scale-110 shadow-xl",
                dragging && active === "e" && "scale-125"
              )}
            />
          </SliderPrimitive.Root>

          {showTips && (
            <div className="mt-2 relative h-5 pointer-events-none">
              <div className="absolute top-0 -translate-x-1/2 text-xs px-2 py-1 rounded bg-popover text-popover-foreground shadow" style={{ left: `${((loDays - minDays) / (maxDays - minDays)) * 100}%` }}>
                {formatPPP(loDate)}
              </div>
              <div className="absolute top-0 -translate-x-1/2 text-xs px-2 py-1 rounded bg-popover text-popover-foreground shadow" style={{ left: `${((hiDays - minDays) / (maxDays - minDays)) * 100}%` }}>
                {formatPPP(hiDate)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
