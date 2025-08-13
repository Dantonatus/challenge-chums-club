import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DateRange = { start: Date; end: Date };

interface DateRangeContextValue extends DateRange {
  setRange: (r: DateRange) => void;
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

export function DateRangeProvider({ userId, children }: { userId?: string | null; children: React.ReactNode }) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Server reference time ("today"), fetched from Supabase
  const [now, setNow] = useState<Date>(new Date());
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
  const sixMonthsAgo = startOfDay(new Date(new Date(now).setMonth(now.getMonth() - 6)));

  const [minDate, setMinDate] = useState<Date>(startOfDay(new Date(sixMonthsAgo))); // placeholder until fetched
  const [range, setRange] = useState<DateRange>({ start: sixMonthsAgo, end: today });


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
        const min = earliest ? new Date(earliest.getTime() - bufferDays * 24 * 60 * 60 * 1000) : sixMonthsAgo;
        const domainMin = startOfDay(min);
        setMinDate(domainMin);

        // If current start is after new domain max, adjust range conservatively
        setRange((cur) => {
          const start = cur.start < domainMin ? domainMin : cur.start;
          const end = cur.end > maxCap ? maxCap : cur.end;
          return { start, end };
        });
      } catch (_) {
        // keep defaults silently
      }
    })();
  }, [userId, sixMonthsAgo, maxCap]);

  const value = useMemo<DateRangeContextValue>(() => ({
    start: range.start,
    end: range.end,
    setRange: (r) => setRange({ start: startOfDay(r.start), end: endOfDay(r.end) }),
    minDate,
    maxDate: maxCap,
    now,
  }), [range, minDate, maxCap, now]);

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
