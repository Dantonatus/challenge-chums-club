import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval, 
  parseISO,
  getDay,
  addMonths,
  subMonths
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, X, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  challenge_type: string;
  frequency: string;
}

interface Log {
  id: string;
  challenge_id: string;
  user_id: string;
  date: string;
  success: boolean;
}

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function EntryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Update selectedDate when year/month changes
  useEffect(() => {
    setSelectedDate(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);

  // Generate years for selection (5 years back, 1 year forward)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  }, []);

  // Calculate month dates
  const monthDates = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [selectedDate]);

  const monthStart = monthDates[0];
  const monthEnd = monthDates[monthDates.length - 1];

  // Fetch user's active challenges
  const { data: challenges } = useQuery({
    queryKey: ["entry-challenges", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data: participations, error: pErr } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", currentUserId!);
      if (pErr) throw pErr;
      
      if (!participations?.length) return [];

      const challengeIds = participations.map(p => p.challenge_id);
      
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, start_date, end_date, challenge_type, frequency")
        .in("id", challengeIds)
        .eq("challenge_type", "habit")
        .eq("status", "active");
      
      if (error) throw error;
      return (data || []) as Challenge[];
    },
  });

  // Fetch logs for the month
  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ["entry-logs", currentUserId, format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("id, challenge_id, user_id, date, success")
        .eq("user_id", currentUserId!)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));
      
      if (error) throw error;
      return (data || []) as Log[];
    },
  });

  // Check if a challenge is active on a given date
  const isChallengeActiveOnDate = (challenge: Challenge, date: Date) => {
    const start = parseISO(challenge.start_date);
    const end = parseISO(challenge.end_date);
    return isWithinInterval(date, { start, end });
  };

  // Get log for a specific challenge and date
  const getLog = (challengeId: string, date: Date) => {
    return logs?.find(
      (l) => l.challenge_id === challengeId && isSameDay(parseISO(l.date), date)
    );
  };

  // Toggle log entry - cycles through: none → success → fail → none
  const toggleLog = async (challengeId: string, date: Date, currentLog: Log | undefined) => {
    if (!currentUserId) return;

    const dateStr = format(date, "yyyy-MM-dd");

    try {
      if (currentLog) {
        if (currentLog.success) {
          // success → fail
          await supabase.from("logs").update({ success: false }).eq("id", currentLog.id);
        } else {
          // fail → delete (back to none)
          await supabase.from("logs").delete().eq("id", currentLog.id);
        }
      } else {
        // none → success
        await supabase.from("logs").insert({
          challenge_id: challengeId,
          user_id: currentUserId,
          date: dateStr,
          success: true,
        });
      }

      refetchLogs();
      qc.invalidateQueries({ queryKey: ["challenge_participants"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  // Navigate months
  const goToPrevMonth = () => {
    const prev = subMonths(selectedDate, 1);
    setSelectedYear(prev.getFullYear());
    setSelectedMonth(prev.getMonth());
  };

  const goToNextMonth = () => {
    const next = addMonths(selectedDate, 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth());
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  // Calculate stats for selected month
  const stats = useMemo(() => {
    if (!challenges?.length || !logs) return { done: 0, notDone: 0, total: 0 };

    let done = 0;
    let notDone = 0;
    let total = 0;

    challenges.forEach((challenge) => {
      monthDates.forEach((date) => {
        if (isChallengeActiveOnDate(challenge, date)) {
          total++;
          const log = getLog(challenge.id, date);
          if (log?.success) done++;
          else if (log && !log.success) notDone++;
        }
      });
    });

    return { done, notDone, total };
  }, [challenges, logs, monthDates]);

  const progressPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  // Get first day offset (0 = Monday in our grid)
  const firstDayOffset = (getDay(monthStart) + 6) % 7;

  return (
    <section className="space-y-4 animate-enter pb-8">
      <Helmet>
        <title>Entry | Habit Tracker</title>
        <meta name="description" content="Tägliche Habit-Übersicht - Abhaken und Fortschritt tracken" />
      </Helmet>

      {/* Simple Header with Month/Year Selection */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Meine Einträge</h1>
            </div>

            {/* Month/Year Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-1">
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-[110px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, i) => (
                      <SelectItem key={i} value={i.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-[80px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs">
                Heute
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar - Simple */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm font-medium min-w-[40px]">{progressPercent}%</span>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 text-sm px-1">
        <span className="text-green-600 dark:text-green-400">✓ {stats.done}</span>
        <span className="text-red-500">✗ {stats.notDone}</span>
        <span className="text-muted-foreground">○ {stats.total - stats.done - stats.notDone} offen</span>
      </div>

      {/* Habit Cards with Calendar Grid */}
      {!challenges?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-2">Keine aktiven Habits gefunden.</p>
            <Link to="/app/challenges" className="text-primary hover:underline">
              Challenge erstellen →
            </Link>
          </CardContent>
        </Card>
      ) : (
        challenges.map((challenge) => (
          <Card key={challenge.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Challenge Title */}
              <Link 
                to={`/challenges/${challenge.id}`}
                className="font-semibold text-base hover:text-primary transition-colors block mb-3"
              >
                {challenge.title}
              </Link>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Weekday Headers */}
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground py-1 font-medium">
                    {day}
                  </div>
                ))}

                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Day Cells */}
                {monthDates.map((date) => {
                  const isActive = isChallengeActiveOnDate(challenge, date);
                  const log = getLog(challenge.id, date);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => isActive && toggleLog(challenge.id, date, log)}
                      disabled={!isActive}
                      className={cn(
                        "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative",
                        isToday && "ring-2 ring-primary ring-offset-1",
                        !isActive && "opacity-30 cursor-not-allowed",
                        isActive && !log && "bg-muted/50 hover:bg-muted",
                        log?.success && "bg-green-500 text-white",
                        log && !log.success && "bg-red-500/80 text-white"
                      )}
                    >
                      <span className={cn(
                        "font-medium",
                        log ? "text-[10px]" : "text-xs"
                      )}>
                        {format(date, "d")}
                      </span>
                      {log?.success && <Check className="h-3 w-3 absolute bottom-0.5" />}
                      {log && !log.success && <X className="h-3 w-3 absolute bottom-0.5" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Simple Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Erledigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-500/80" />
          <span>Nicht erledigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted" />
          <span>Offen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded ring-2 ring-primary" />
          <span>Heute</span>
        </div>
      </div>
    </section>
  );
}
