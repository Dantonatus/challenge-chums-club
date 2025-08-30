import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface ProfileDateRangeSelectorProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export function ProfileDateRangeSelector({ 
  dateRange, 
  onDateRangeChange 
}: ProfileDateRangeSelectorProps) {
  const lang = navigator.language?.startsWith("de") ? "de" : "en";

  const quickFilters = [
    {
      label: lang === "de" ? "Letzte 7 Tage" : "Last 7 days",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { start: startOfDay(start), end: endOfDay(end) };
      }
    },
    {
      label: lang === "de" ? "Letzte 30 Tage" : "Last 30 days", 
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return { start: startOfDay(start), end: endOfDay(end) };
      }
    },
    {
      label: lang === "de" ? "Letzte 90 Tage" : "Last 90 days",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        return { start: startOfDay(start), end: endOfDay(end) };
      }
    },
    {
      label: lang === "de" ? "Jahr bis heute" : "Year to date",
      getValue: () => {
        const end = new Date();
        const start = new Date(end.getFullYear(), 0, 1);
        return { start: startOfDay(start), end: endOfDay(end) };
      }
    },
    {
      label: lang === "de" ? "Alles" : "All",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setFullYear(start.getFullYear() - 2);
        return { start: startOfDay(start), end: endOfDay(end) };
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <Button
            key={filter.label}
            variant="outline"
            size="sm"
            onClick={() => onDateRangeChange(filter.getValue())}
            className="text-sm"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.start ? (
                dateRange.end ? (
                  <>
                    {format(dateRange.start, "LLL dd, y")} -{" "}
                    {format(dateRange.end, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.start, "LLL dd, y")
                )
              ) : (
                <span>{lang === "de" ? "Datum auswählen" : "Pick a date"}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.start}
              selected={{
                from: dateRange?.start,
                to: dateRange?.end,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({
                    start: startOfDay(range.from),
                    end: endOfDay(range.to)
                  });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}