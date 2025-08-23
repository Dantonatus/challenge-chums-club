import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DateRange = { start: Date; end: Date };
export type SummaryRangePreset = 'thisYear' | 'last30d' | 'last6months' | 'custom';

interface DateRangeContextValue extends DateRange {
  setRange: (r: DateRange) => void;
  preset: SummaryRangePreset;
  setPreset: (preset: SummaryRangePreset) => void;
  minDate: Date; // earliest domain start
  maxDate: Date; // latest domain end (today + buffer)
  now: Date; // server reference "current" time
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getPresetRange(preset: SummaryRangePreset, now: Date): DateRange {
  const currentYear = now.getFullYear();
  
  switch (preset) {
    case 'thisYear':
      return {
        start: startOfDay(new Date(currentYear, 0, 1)), // Jan 1 current year
        end: endOfDay(new Date(currentYear, 11, 31))   // Dec 31 current year
      };
    case 'last30d':
      return {
        start: startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
        end: endOfDay(now)
      };
    case 'last6months':
      return {
        start: startOfDay(new Date(new Date(now).setMonth(now.getMonth() - 6))),
        end: endOfDay(now)
      };
    case 'custom':
    default:
      // Return 6 months as default for custom
      return {
        start: startOfDay(new Date(new Date(now).setMonth(now.getMonth() - 6))),
        end: endOfDay(now)
      };
  }
}

export function DateRangeProvider({ userId, children }: { userId?: string | null; children: React.ReactNode }) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Server reference time ("today"), fetched from Supabase
  const [now, setNow] = useState<Date>(new Date());
  const [preset, setPreset] = useState<SummaryRangePreset>('last6months');
  
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.rpc("get_server_time");
        if (data) setNow(new Date(data as any));
      } catch (_) {
        // fallback to client time
      }
    })();
  }, []);

  const today = endOfDay(new Date(now));
  const maxCap = endOfDay(new Date(now.getTime() + 7 * DAY_MS));

  const [minDate, setMinDate] = useState<Date>(startOfDay(new Date(new Date(now).setMonth(now.getMonth() - 6)))); // placeholder until fetched
  const [range, setRange] = useState<DateRange>(getPresetRange('last6months', now));

  // Update range when preset changes
  useEffect(() => {
    if (preset !== 'custom') {
      const newRange = getPresetRange(preset, now);
      setRange(newRange);
    }
  }, [preset, now]);

  // Discover earliest relevant date for the user and expand domain accordingly
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        // Earliest challenge start where user participates
        const { data: parts } = await supabase
          .from("challenge_participants")
          .select("challenge_id")
          .eq("user_id", userId);
        const chIds = Array.from(new Set((parts || []).map((p: any) => p.challenge_id)));
        let earliestChallenge: Date | undefined;
        if (chIds.length) {
          const { data: ch } = await supabase
            .from("challenges")
            .select("start_date")
            .in("id", chIds)
            .order("start_date", { ascending: true })
            .limit(1);
          if (ch && ch.length) earliestChallenge = new Date(ch[0].start_date as any);
        }

        // Earliest violation by user
        let earliestViolation: Date | undefined;
        const { data: viol } = await supabase
          .from("challenge_violations")
          .select("created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);
        if (viol && viol.length) earliestViolation = new Date(viol[0].created_at as any);

        const earliest = [earliestChallenge, earliestViolation]
          .filter(Boolean)
          .map((d) => (d as Date))
          .sort((a, b) => a.getTime() - b.getTime())[0];

        const bufferDays = 14;
        const min = earliest ? new Date(earliest.getTime() - bufferDays * 24 * 60 * 60 * 1000) : startOfDay(new Date(new Date(now).setMonth(now.getMonth() - 6)));
        const domainMin = startOfDay(min);
        setMinDate(domainMin);

        // If current start is after new domain max, adjust range conservatively (only for custom preset)
        if (preset === 'custom') {
          setRange((cur) => {
            const start = cur.start < domainMin ? domainMin : cur.start;
            const end = cur.end > maxCap ? maxCap : cur.end;
            return { start, end };
          });
        }
      } catch (_) {
        // keep defaults silently
      }
    })();
  }, [userId, now, maxCap, preset]);

  const setRangeFunction = useCallback((r: DateRange) => {
    const newRange = { start: startOfDay(r.start), end: endOfDay(r.end) };
    setRange(newRange);
    setPreset('custom'); // Mark as custom when manually setting range
  }, []);

  const setPresetFunction = useCallback((newPreset: SummaryRangePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      const newRange = getPresetRange(newPreset, now);
      setRange(newRange);
    }
  }, [now]);

  const value = useMemo<DateRangeContextValue>(() => ({
    start: range.start,
    end: range.end,
    setRange: setRangeFunction,
    preset,
    setPreset: setPresetFunction,
    minDate,
    maxDate: maxCap,
    now,
  }), [range, setRangeFunction, preset, setPresetFunction, minDate, maxCap, now]);

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
