import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks,
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval, 
  parseISO
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, X, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function EntryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Week-based navigation with year selector
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Only 2026 and 2027 available
  const years = useMemo(() => [2026, 2027], []);

  // Calculate week dates based on year and offset
  const weekDates = useMemo(() => {
    // Start from first Monday of selected year, then add offset
    const jan1 = new Date(selectedYear, 0, 1);
    const firstMonday = startOfWeek(jan1, { weekStartsOn: 1 });
    const targetWeek = addWeeks(firstMonday, weekOffset);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [selectedYear, weekOffset]);

  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  // Week number display
  const weekNumber = useMemo(() => {
    const startOfYearDate = new Date(weekStart.getFullYear(), 0, 1);
    const diffMs = weekStart.getTime() - startOfYearDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.ceil((diffDays + startOfYearDate.getDay() + 1) / 7);
  }, [weekStart]);

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

  // Fetch logs for the week
  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ["entry-logs", currentUserId, format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("id, challenge_id, user_id, date, success")
        .eq("user_id", currentUserId!)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));
      
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

  // Navigation
  const goToPrevWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => setWeekOffset(prev => prev + 1);
  const goToToday = () => {
    setSelectedYear(today.getFullYear());
    setWeekOffset(0);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!challenges?.length || !logs) return { done: 0, notDone: 0, total: 0 };

    let done = 0;
    let notDone = 0;
    let total = 0;

    challenges.forEach((challenge) => {
      weekDates.forEach((date) => {
        if (isChallengeActiveOnDate(challenge, date)) {
          total++;
          const log = getLog(challenge.id, date);
          if (log?.success) done++;
          else if (log && !log.success) notDone++;
        }
      });
    });

    return { done, notDone, total };
  }, [challenges, logs, weekDates]);

  const progressPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <section className="space-y-4 animate-enter pb-8">
      <Helmet>
        <title>Entry | Habit Tracker</title>
        <meta name="description" content="Wöchentliche Habit-Übersicht - Abhaken und Fortschritt tracken" />
      </Helmet>

      {/* Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Entry</h1>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goToPrevWeek} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => {
                  setSelectedYear(parseInt(v));
                  setWeekOffset(0);
                }}
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

              <span className="text-sm font-medium px-2">KW {weekNumber}</span>

              <Button variant="ghost" size="icon" onClick={goToNextWeek} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs">
                Heute
              </Button>
            </div>
          </div>

          {/* Week date range display */}
          <div className="text-center text-sm text-muted-foreground mt-2">
            {format(weekStart, "d. MMM", { locale: de })} – {format(weekEnd, "d. MMM yyyy", { locale: de })}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-3 px-1">
        <Progress value={progressPercent} className="flex-1 h-2" />
        <span className="text-sm font-medium min-w-[40px]">{progressPercent}%</span>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm px-1">
        <span className="text-green-600 dark:text-green-400">✓ {stats.done}</span>
        <span className="text-red-500">✗ {stats.notDone}</span>
        <span className="text-muted-foreground">○ {stats.total - stats.done - stats.notDone} offen</span>
      </div>

      {/* Table Grid */}
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
        <Card className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_repeat(7,48px)] gap-1 p-3 border-b bg-muted/30">
              <div className="text-sm font-semibold text-muted-foreground">Challenge</div>
              {weekDates.map((date) => (
                <div 
                  key={date.toISOString()} 
                  className={cn(
                    "text-center text-xs",
                    isSameDay(date, today) && "text-primary font-bold"
                  )}
                >
                  <div className="font-medium">{WEEKDAYS[(date.getDay() + 6) % 7]}</div>
                  <div className={cn(
                    "text-muted-foreground",
                    isSameDay(date, today) && "text-primary"
                  )}>
                    {format(date, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Table Rows */}
            {challenges.map((challenge) => (
              <div 
                key={challenge.id} 
                className="grid grid-cols-[1fr_repeat(7,48px)] gap-1 p-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                {/* Challenge Name */}
                <Link 
                  to={`/challenges/${challenge.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors truncate pr-2 flex items-center"
                >
                  {challenge.title}
                </Link>

                {/* Day Cells */}
                {weekDates.map((date) => {
                  const isActive = isChallengeActiveOnDate(challenge, date);
                  const log = getLog(challenge.id, date);
                  const isToday = isSameDay(date, today);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => isActive && toggleLog(challenge.id, date, log)}
                      disabled={!isActive}
                      className={cn(
                        "h-10 w-10 mx-auto rounded-lg flex items-center justify-center transition-all text-sm",
                        isToday && "ring-2 ring-primary ring-offset-1",
                        !isActive && "opacity-20 cursor-not-allowed bg-muted/30",
                        isActive && !log && "bg-muted/50 hover:bg-muted cursor-pointer",
                        log?.success && "bg-green-500 text-white hover:bg-green-600",
                        log && !log.success && "bg-red-500 text-white hover:bg-red-600"
                      )}
                    >
                      {log?.success && <Check className="h-4 w-4" />}
                      {log && !log.success && <X className="h-4 w-4" />}
                      {!log && isActive && <span className="text-muted-foreground text-xs">–</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
          <span>Erledigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-500 flex items-center justify-center">
            <X className="h-2.5 w-2.5 text-white" />
          </div>
          <span>Nicht erledigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted" />
          <span>Offen</span>
        </div>
        <span className="text-muted-foreground/60 italic">Klick: ✓ → ✗ → leer</span>
      </div>
    </section>
  );
}
