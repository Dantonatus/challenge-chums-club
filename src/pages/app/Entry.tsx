import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, X, Minus } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function EntryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Calculate current week dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const baseDate = addDays(today, weekOffset * 7);
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekOffset]);

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  // Fetch user's active challenges (only habit challenges where user is participant)
  const { data: challenges } = useQuery({
    queryKey: ["entry-challenges", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      // Get challenges where user is participant
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

  // Toggle log entry
  const toggleLog = async (challengeId: string, date: Date, currentLog: Log | undefined) => {
    if (!currentUserId) return;

    const dateStr = format(date, "yyyy-MM-dd");

    try {
      if (currentLog) {
        // Toggle success status or delete if was fail
        if (currentLog.success) {
          // Change to fail
          const { error } = await supabase
            .from("logs")
            .update({ success: false })
            .eq("id", currentLog.id);
          if (error) throw error;
        } else {
          // Delete log (back to unchecked)
          const { error } = await supabase
            .from("logs")
            .delete()
            .eq("id", currentLog.id);
          if (error) throw error;
        }
      } else {
        // Create new log as success
        const { error } = await supabase
          .from("logs")
          .insert({
            challenge_id: challengeId,
            user_id: currentUserId,
            date: dateStr,
            success: true,
          });
        if (error) throw error;
      }

      refetchLogs();
      qc.invalidateQueries({ queryKey: ["challenge_participants"] });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  // Calculate progress stats
  const stats = useMemo(() => {
    if (!challenges?.length || !logs) return { done: 0, notDone: 0, total: 0 };

    let done = 0;
    let notDone = 0;
    let total = 0;

    challenges.forEach((challenge) => {
      weekDates.forEach((date) => {
        if (isChallengeActiveOnDate(challenge, date) && date <= new Date()) {
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
    <section className="space-y-6 animate-enter">
      <Helmet>
        <title>Entry | Habit Tracker</title>
        <meta name="description" content="Tägliche Habit-Übersicht - Abhaken und Fortschritt tracken" />
      </Helmet>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tägliche Einträge</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekStart, "d. MMM", { locale: de })} - {format(weekEnd, "d. MMM yyyy", { locale: de })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              Heute
            </Button>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Wochenfortschritt</span>
            <span className="text-lg font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>✓ {stats.done} erledigt</span>
            <span>✗ {stats.notDone} nicht erledigt</span>
            <span>— {stats.total - stats.done - stats.notDone} offen</span>
          </div>
        </CardContent>
      </Card>

      {/* Habit Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meine Habits</CardTitle>
        </CardHeader>
        <CardContent>
          {!challenges?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine aktiven Habit-Challenges gefunden.</p>
              <Link to="/app/challenges" className="text-primary hover:underline mt-2 inline-block">
                Challenge erstellen →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2 min-w-[150px] text-sm font-medium text-muted-foreground">
                      Habit
                    </th>
                    {weekDates.map((date) => (
                      <th 
                        key={date.toISOString()} 
                        className={cn(
                          "py-2 px-1 text-center min-w-[50px]",
                          isSameDay(date, new Date()) && "bg-primary/10 rounded-t-lg"
                        )}
                      >
                        <div className="text-xs text-muted-foreground">
                          {format(date, "EEE", { locale: de })}
                        </div>
                        <div className={cn(
                          "text-sm font-medium",
                          isSameDay(date, new Date()) && "text-primary"
                        )}>
                          {format(date, "d")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {challenges.map((challenge) => (
                    <tr key={challenge.id} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2">
                        <Link 
                          to={`/challenges/${challenge.id}`}
                          className="font-medium hover:text-primary transition-colors text-sm"
                        >
                          {challenge.title}
                        </Link>
                      </td>
                      {weekDates.map((date) => {
                        const isActive = isChallengeActiveOnDate(challenge, date);
                        const isFuture = date > new Date();
                        const log = getLog(challenge.id, date);
                        
                        return (
                          <td 
                            key={date.toISOString()} 
                            className={cn(
                              "py-3 px-1 text-center",
                              isSameDay(date, new Date()) && "bg-primary/10"
                            )}
                          >
                            {!isActive ? (
                              <span className="text-muted-foreground/30">—</span>
                            ) : isFuture ? (
                              <div className="w-7 h-7 mx-auto rounded border border-dashed border-muted-foreground/30" />
                            ) : (
                              <button
                                onClick={() => toggleLog(challenge.id, date, log)}
                                className={cn(
                                  "w-7 h-7 mx-auto rounded border-2 flex items-center justify-center transition-all",
                                  log?.success && "bg-green-500 border-green-500 text-white",
                                  log && !log.success && "bg-red-500/20 border-red-500 text-red-500",
                                  !log && "border-muted-foreground/30 hover:border-primary hover:bg-primary/10"
                                )}
                              >
                                {log?.success && <Check className="h-4 w-4" />}
                                {log && !log.success && <X className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
          <span>Erledigt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
            <X className="h-3 w-3 text-red-500" />
          </div>
          <span>Nicht erledigt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
          <span>Noch offen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded border border-dashed border-muted-foreground/30" />
          <span>Zukünftig</span>
        </div>
      </div>
    </section>
  );
}
