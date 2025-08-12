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

export function DateRangeBar({ className, sticky = true }: { className?: string; sticky?: boolean }) {
  const { start, end, minDate, maxDate, setRange } = useDateRange();
  const lang = (navigator.language?.startsWith("de") ? "de" : "en") as keyof typeof dict;
  const t = dict[lang];

  const minDays = React.useMemo(() => daysSinceEpoch(minDate), [minDate]);
  const maxDays = React.useMemo(() => daysSinceEpoch(maxDate), [maxDate]);
  const [local, setLocal] = React.useState<[number, number]>([daysSinceEpoch(start), daysSinceEpoch(end)]);

  // Keep local in sync with provider
  React.useEffect(() => {
    setLocal([daysSinceEpoch(start), daysSinceEpoch(end)]);
  }, [start, end]);

// commit updates on drag end via onValueCommit for reliability

  // Month ticks
  const monthTicks = React.useMemo(() => {
    const ticks: { pos: number; label: string }[] = [];
    const d = new Date(minDate);
    d.setDate(1);
    while (d <= maxDate) {
      const pos = ((daysSinceEpoch(d) - minDays) / (maxDays - minDays)) * 100;
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      ticks.push({ pos, label });
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }, [minDate, maxDate, minDays, maxDays]);

  const applyPreset = (key: string) => {
    const today = new Date();
    const endDate = today;
    let startDate: Date;
    switch (key) {
      case "7d": startDate = new Date(today.getTime() - 7*86400000); break;
      case "30d": startDate = new Date(today.getTime() - 30*86400000); break;
      case "90d": startDate = new Date(today.getTime() - 90*86400000); break;
      case "6M": startDate = new Date(today); startDate.setMonth(today.getMonth() - 6); break;
      case "YTD": startDate = new Date(today.getFullYear(), 0, 1); break;
      case "1Y": startDate = new Date(today); startDate.setFullYear(today.getFullYear() - 1); break;
      case "All": startDate = new Date(minDate); break;
      default: startDate = new Date(minDate);
    }
    const sVal = Math.max(daysSinceEpoch(startDate), minDays);
    const eVal = Math.min(daysSinceEpoch(endDate), maxDays);
    const next: [number, number] = [Math.min(sVal, eVal), Math.max(sVal, eVal)];
    setLocal(next);
    setRange({ start: dateFromDays(next[0]), end: dateFromDays(next[1]) });
  };

// built-in keyboard support from Radix will handle arrow keys

  const [sDays, eDays] = local;
  const sDate = dateFromDays(sDays);
  const eDate = dateFromDays(eDays);

  return (
    <Card className={cn("rounded-xl shadow-sm border bg-gradient-to-r from-background to-muted/30", sticky && "sticky top-0 z-30")}> 
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm text-muted-foreground">{t.title}</CardTitle>
          <div className="text-sm font-medium tabular-nums">{formatPPP(sDate)} — {formatPPP(eDate)}</div>
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
          <div className="absolute inset-x-0 top-0 h-5">
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
            className="relative flex w-full select-none items-center"
            min={minDays}
            max={maxDays}
            step={1}
            value={[sDays, eDays]}
            onValueChange={(v) => setLocal([Math.min(v[0], v[1]), Math.max(v[0], v[1])])}
            onValueCommit={(v) => setRange({ start: dateFromDays(Math.min(v[0], v[1])), end: dateFromDays(Math.max(v[0], v[1])) })}
            aria-label={t.title}
          >
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>

            {/* Start thumb */}
            <SliderPrimitive.Thumb
              aria-label={t.startThumb}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {/* End thumb */}
            <SliderPrimitive.Thumb
              aria-label={t.endThumb}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </SliderPrimitive.Root>

          {/* tooltips near thumbs */}
          <div className="mt-3 relative h-0">
            <div className="absolute -translate-x-1/2 -translate-y-full text-xs px-2 py-1 rounded bg-popover text-popover-foreground shadow" style={{ left: `${((sDays - minDays) / (maxDays - minDays)) * 100}%` }}>
              {formatPPP(sDate)}
            </div>
            <div className="absolute -translate-x-1/2 -translate-y-full text-xs px-2 py-1 rounded bg-popover text-popover-foreground shadow" style={{ left: `${((eDays - minDays) / (maxDays - minDays)) * 100}%` }}>
              {formatPPP(eDate)}
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{t.appliesNote}</p>
        </div>
      </CardContent>
    </Card>
  );
}
