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

function daysSinceEpoch(d: Date) {
  return Math.floor(d.getTime() / 86400000);
}
function dateFromDays(n: number) {
  return new Date(n * 86400000);
}
function formatPPP(d: Date) {
  // Use Intl for lightweight pretty format
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

  // Debounce commit to context
  React.useEffect(() => {
    const id = setTimeout(() => {
      const [s, e] = local;
      const ns = dateFromDays(Math.min(Math.max(s, minDays), maxDays));
      const ne = dateFromDays(Math.min(Math.max(e, minDays), maxDays));
      setRange({ start: ns, end: ne });
    }, 250);
    return () => clearTimeout(id);
  }, [local, minDays, maxDays, setRange]);

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
    const end = today;
    let start: Date;
    switch (key) {
      case "7d": start = new Date(today.getTime() - 7*86400000); break;
      case "30d": start = new Date(today.getTime() - 30*86400000); break;
      case "90d": start = new Date(today.getTime() - 90*86400000); break;
      case "6M": start = new Date(today); start.setMonth(today.getMonth() - 6); break;
      case "YTD": start = new Date(today.getFullYear(), 0, 1); break;
      case "1Y": start = new Date(today); start.setFullYear(today.getFullYear() - 1); break;
      case "All": start = new Date(minDate); break;
      default: start = new Date(minDate);
    }
    const s = Math.max(daysSinceEpoch(start), minDays);
    const e = Math.min(daysSinceEpoch(end), maxDays);
    setLocal([s, e]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLSpanElement>, which: 'start'|'end') => {
    const step = (e.shiftKey ? 7 : 1);
    if (e.key === 'ArrowLeft') {
      setLocal(([a,b]) => which==='start' ? [a - step, Math.max(a - step, b)] : [Math.min(a, b - step), b - step]);
    } else if (e.key === 'ArrowRight') {
      setLocal(([a,b]) => which==='start' ? [a + step, Math.max(a + step, b)] : [Math.min(a, b + step), b + step]);
    }
  };

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
            onValueChange={(v) => setLocal([v[0], v[1]])}
            aria-label={t.title}
          >
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>

            {/* Start thumb */}
            <SliderPrimitive.Thumb
              aria-label={t.startThumb}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onKeyDown={(e) => handleKey(e, 'start')}
            />
            {/* End thumb */}
            <SliderPrimitive.Thumb
              aria-label={t.endThumb}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onKeyDown={(e) => handleKey(e, 'end')}
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
