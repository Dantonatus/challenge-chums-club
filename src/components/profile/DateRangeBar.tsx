import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDateRange } from "@/contexts/DateRangeContext";

const dict = {
  de: {
    title: "Zeitraum",
    presets: "Voreinstellungen",
    appliesNote: "Gilt für alle Kacheln und Charts, außer ‘Verletzungen (30 Tage)’.",
    startThumb: "Startdatum",
    endThumb: "Enddatum",
    presetsList: ["7d", "30d", "90d", "6M", "YTD", "1Y", "All"],
  },
  en: {
    title: "Date Range",
    presets: "Presets",
    appliesNote: "Applies to all cards and charts except ‘Violations (30 days)’.",
    startThumb: "Start date",
    endThumb: "End date",
    presetsList: ["7d", "30d", "90d", "6M", "YTD", "1Y", "All"],
  }
} as const;

const MS_DAY = 86400000;
function daysSinceEpochLocal(d: Date) {
  // normalize to local midnight to avoid TZ drift
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(localMidnight.getTime() / MS_DAY);
}
function dateFromLocalDayNumber(n: number) {
  const base = new Date(1970, 0, 1);
  base.setDate(base.getDate() + n);
  return base; // local midnight
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

  const minDays = React.useMemo(() => daysSinceEpochLocal(minDate), [minDate]);
  const maxDays = React.useMemo(() => daysSinceEpochLocal(maxDate), [maxDate]);
  const [local, setLocal] = React.useState<[number, number]>([daysSinceEpochLocal(start), daysSinceEpochLocal(end)]);
  const [active, setActive] = React.useState<"s" | "e" | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const showTips = dragging || hover;

  // Keep local in sync with provider
  React.useEffect(() => {
    setLocal([daysSinceEpochLocal(start), daysSinceEpochLocal(end)]);
  }, [start, end]);

// commit updates on drag end via onValueCommit for reliability

  // Month ticks
  const monthTicks = React.useMemo(() => {
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

  const applyPreset = (key: string) => {
    const ref = now ?? new Date();
    const endDate = ref; // preserve current time-of-day for "today"
    let startDate: Date;
    switch (key) {
      case "7d": startDate = new Date(ref.getTime() - 7 * MS_DAY); break;
      case "30d": startDate = new Date(ref.getTime() - 30 * MS_DAY); break;
      case "90d": startDate = new Date(ref.getTime() - 90 * MS_DAY); break;
      case "6M": startDate = new Date(ref); startDate.setMonth(ref.getMonth() - 6); break;
      case "YTD": startDate = new Date(ref.getFullYear(), 0, 1); break;
      case "1Y": startDate = new Date(ref); startDate.setFullYear(ref.getFullYear() - 1); break;
      case "All": startDate = new Date(minDate); break;
      default: startDate = new Date(minDate);
    }
    const sVal = Math.max(daysSinceEpochLocal(startDate), minDays);
    const eVal = Math.min(daysSinceEpochLocal(endDate), maxDays);

    // reflect on the slider (kept ordered by clamping logic elsewhere)
    setLocal([sVal, eVal]);

    const todayN = daysSinceEpochLocal(ref);
    const loN = Math.min(sVal, eVal);
    const hiN = Math.max(sVal, eVal);

    const commitStart = dateFromLocalDayNumber(loN); // start of day
    const commitEnd = hiN === todayN ? new Date(ref) : endOfLocalDayFromDayNumber(hiN);

    setRange({ start: commitStart, end: commitEnd });
  };

// built-in keyboard support from Radix will handle arrow keys

  const [sDays, eDays] = local;
  const loDays = Math.min(sDays, eDays);
  const hiDays = Math.max(sDays, eDays);
  const loDate = dateFromLocalDayNumber(loDays);
  const hiDate = dateFromLocalDayNumber(hiDays);

  return (
    <Card className={cn("rounded-xl shadow-sm border bg-gradient-to-r from-background to-muted/30", sticky && "sticky top-0 z-30")}> 
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm text-muted-foreground">{t.title}</CardTitle>
          <div className="text-sm font-medium tabular-nums">{formatPPP(loDate)} — {formatPPP(hiDate)}</div>
          <div className="flex items-center gap-1">
            {t.presetsList.map((key) => (
              <Button key={key} size="sm" variant="secondary" className="h-7 px-2" onClick={() => applyPreset(key)}>
                {key}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative pt-6 pb-3">
          <div className="absolute inset-x-0 top-0 h-5 pointer-events-none">
            {/* month ticks */}
            <div className="relative h-full">
              {monthTicks.map((t, i) => (
                <div key={i} className="absolute top-0 -translate-x-1/2 text-[10px] text-muted-foreground" style={{ left: `${t.pos}%` }}>
                  <div className="w-px h-2 bg-border mx-auto" />
                  <div className="mt-1">{t.label}</div>
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
                return [clamp(a), clamp(b)];
              });
            }}
            onValueCommit={(v) => {
              const [a, b] = v as [number, number];
              const sN = Math.min(a, b);
              const eN = Math.max(a, b);
              const refNow = now ?? new Date();
              const todayN = daysSinceEpochLocal(refNow);

              const startDate = dateFromLocalDayNumber(sN); // start of day local
              const endDate = eN === todayN ? new Date(refNow) : endOfLocalDayFromDayNumber(eN);

              setRange({ start: startDate, end: endDate });
            }}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => { setDragging(false); setActive(null); }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            aria-label={t.title}
          >
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>

            {/* Start thumb */}
            <SliderPrimitive.Thumb
              aria-label={t.startThumb}
              onPointerDown={() => setActive("s")}
              className="block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {/* End thumb */}
            <SliderPrimitive.Thumb
              aria-label={t.endThumb}
              onPointerDown={() => setActive("e")}
              className="block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </SliderPrimitive.Root>

          {/* tooltips near thumbs */}
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

          <p className="mt-4 text-xs text-muted-foreground">{t.appliesNote}</p>
        </div>
      </CardContent>
    </Card>
  );
}
