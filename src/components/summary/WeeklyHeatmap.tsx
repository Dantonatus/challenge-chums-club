import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subWeeks, startOfWeek, eachDayOfInterval, endOfWeek, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface DayEntry {
  date: string;
  success: boolean | null;
}

interface WeeklyHeatmapProps {
  habitStats: Array<{
    challengeId: string;
    title: string;
    lastSevenDays?: DayEntry[];
    last30Days?: DayEntry[];
  }>;
  lang: "de" | "en";
  weeksToShow?: number;
}

const t = {
  de: {
    title: "Wochenübersicht",
    noData: "Noch keine Einträge",
    success: "Erledigt",
    fail: "Nicht erledigt",
    open: "Offen",
  },
  en: {
    title: "Weekly Overview",
    noData: "No entries yet",
    success: "Completed",
    fail: "Not completed",
    open: "Open",
  },
};

const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyHeatmap({ habitStats, lang, weeksToShow = 4 }: WeeklyHeatmapProps) {
  const labels = t[lang];
  const weekdays = lang === "de" ? WEEKDAYS_DE : WEEKDAYS_EN;
  const locale = lang === "de" ? de : enUS;

  // Generate week ranges
  const weekRanges = useMemo(() => {
    const today = new Date();
    const ranges = [];

    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      ranges.unshift({
        label: format(weekStart, "dd.MM", { locale }),
        days: days.map((d) => format(d, "yyyy-MM-dd")),
      });
    }

    return ranges;
  }, [weeksToShow, locale]);

  // Aggregate all habits' data for heatmap
  const heatmapData = useMemo(() => {
    const dataMap: Record<string, { success: number; fail: number; total: number }> = {};

    habitStats.forEach((habit) => {
      // Use last30Days if available, fallback to lastSevenDays
      const daysData = habit.last30Days || habit.lastSevenDays || [];
      daysData.forEach((day) => {
        if (!dataMap[day.date]) {
          dataMap[day.date] = { success: 0, fail: 0, total: 0 };
        }
        if (day.success !== null) {
          dataMap[day.date].total++;
          if (day.success === true) dataMap[day.date].success++;
          if (day.success === false) dataMap[day.date].fail++;
        }
      });
    });

    return dataMap;
  }, [habitStats]);

  const getCellColor = (dateStr: string) => {
    const data = heatmapData[dateStr];
    if (!data || data.total === 0) return "bg-muted/30";

    const successRate = data.success / data.total;
    if (successRate >= 0.8) return "bg-green-500";
    if (successRate >= 0.6) return "bg-green-400";
    if (successRate >= 0.4) return "bg-amber-400";
    if (successRate > 0) return "bg-orange-400";
    if (data.fail > 0) return "bg-red-400";
    return "bg-muted/50";
  };

  const getCellTooltip = (dateStr: string) => {
    const data = heatmapData[dateStr];
    if (!data) return "";
    return `${data.success}/${data.total} ${labels.success}`;
  };

  if (!habitStats.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {labels.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          {labels.noData}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Weekday Headers */}
        <div className="flex gap-1 mb-2">
          <div className="w-12" /> {/* Spacer for week labels */}
          {weekdays.map((day) => (
            <div
              key={day}
              className="flex-1 text-center text-xs text-muted-foreground font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1">
          {weekRanges.map((week) => (
            <div key={week.label} className="flex gap-1 items-center">
              <div className="w-12 text-xs text-muted-foreground text-right pr-2">
                {week.label}
              </div>
              {week.days.map((dateStr) => (
                <div
                  key={dateStr}
                  className={cn(
                    "flex-1 aspect-square rounded-sm transition-all hover:scale-110",
                    getCellColor(dateStr)
                  )}
                  title={getCellTooltip(dateStr)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>{labels.success}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <span>{labels.fail}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted/50" />
            <span>{labels.open}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
