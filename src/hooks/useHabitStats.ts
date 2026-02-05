import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import { useMemo } from "react";
import { calculateAchievements, getNextAchievement, UnlockedAchievement, Achievement } from "@/lib/achievements";

interface HabitStats {
  challengeId: string;
  title: string;
  totalEntries: number;
  successfulEntries: number;
  failedEntries: number;
  successRate: number;
  currentStreak: number;
  longestStreak: number;
  lastSevenDays: Array<{ date: string; success: boolean | null }>;
  last30Days: Array<{ date: string; success: boolean | null }>;
  todayStatus: 'done' | 'pending' | 'missed';
  missedYesterday: boolean;
  streakAtRisk: boolean;
}

interface Log {
  id: string;
  challenge_id: string;
  date: string;
  success: boolean;
}

interface Challenge {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

interface OverallStats {
  totalHabits: number;
  averageSuccessRate: number;
  totalSuccesses: number;
  totalEntries: number;
  bestStreak: number;
  bestStreakHabit: string;
  thisWeekSuccessRate: number;
  lastWeekSuccessRate: number;
  trend: number;
  achievements: UnlockedAchievement[];
  nextGoal: { achievement: Achievement; progress: number; max: number; habitTitle?: string } | null;
}

export function useHabitStats() {
  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Fetch all habit challenges for user
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["habit-challenges", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get challenges user participates in
      const { data: participations } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", user!.id);

      if (!participations?.length) return [];

      const challengeIds = participations.map((p) => p.challenge_id);

      const { data } = await supabase
        .from("challenges")
        .select("id, title, start_date, end_date")
        .in("id", challengeIds)
        .eq("challenge_type", "habit")
        .eq("status", "active");

      return (data || []) as Challenge[];
    },
  });

  // Fetch all logs for user
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["all-habit-logs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("logs")
        .select("id, challenge_id, date, success")
        .eq("user_id", user!.id)
        .order("date", { ascending: false });

      return (data || []) as Log[];
    },
  });

  // Calculate stats for each challenge
  const habitStats = useMemo((): HabitStats[] => {
    if (!challenges || !logs) return [];

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");
    
    const lastSevenDaysInterval = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });
    
    const last30DaysInterval = eachDayOfInterval({
      start: subDays(today, 29),
      end: today,
    });

    return challenges.map((challenge) => {
      const challengeLogs = logs.filter((l) => l.challenge_id === challenge.id);

      // Basic counts
      const totalEntries = challengeLogs.length;
      const successfulEntries = challengeLogs.filter((l) => l.success).length;
      const failedEntries = challengeLogs.filter((l) => !l.success).length;
      const successRate = totalEntries > 0 ? (successfulEntries / totalEntries) * 100 : 0;

      // Last 7 days for backward compatibility
      const lastSevenDays = lastSevenDaysInterval.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const log = challengeLogs.find((l) => l.date === dateStr);
        return {
          date: dateStr,
          success: log ? log.success : null,
        };
      });
      
      // Last 30 days for heatmap
      const last30Days = last30DaysInterval.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const log = challengeLogs.find((l) => l.date === dateStr);
        return {
          date: dateStr,
          success: log ? log.success : null,
        };
      });
      
      // Today's status
      const todayLog = challengeLogs.find((l) => l.date === todayStr);
      const todayStatus: 'done' | 'pending' | 'missed' = todayLog 
        ? (todayLog.success ? 'done' : 'missed') 
        : 'pending';
      
      // Yesterday's status for "Never Miss Twice"
      const yesterdayLog = challengeLogs.find((l) => l.date === yesterdayStr);
      const missedYesterday = !yesterdayLog || !yesterdayLog.success;

      // Calculate current streak (consecutive successful days ending today or yesterday)
      const sortedSuccessLogs = challengeLogs
        .filter((l) => l.success)
        .map((l) => parseISO(l.date))
        .sort((a, b) => b.getTime() - a.getTime());

      let currentStreak = 0;
      if (sortedSuccessLogs.length > 0) {
        // Check if most recent success is today or yesterday
        const mostRecent = sortedSuccessLogs[0];
        const diffDays = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          currentStreak = 1;
          let checkDate = subDays(mostRecent, 1);
          
          for (let i = 1; i < sortedSuccessLogs.length; i++) {
            if (isSameDay(sortedSuccessLogs[i], checkDate)) {
              currentStreak++;
              checkDate = subDays(checkDate, 1);
            } else {
              break;
            }
          }
        }
      }

      // Streak at risk: has a streak AND missed yesterday
      const streakAtRisk = currentStreak > 0 && missedYesterday && todayStatus !== 'done';

      // Calculate longest streak
      let longestStreak = 0;
      if (sortedSuccessLogs.length > 0) {
        const allSuccessDates = challengeLogs
          .filter((l) => l.success)
          .map((l) => l.date)
          .sort();

        let tempStreak = 1;
        for (let i = 1; i < allSuccessDates.length; i++) {
          const prevDate = parseISO(allSuccessDates[i - 1]);
          const currDate = parseISO(allSuccessDates[i]);
          const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      return {
        challengeId: challenge.id,
        title: challenge.title,
        totalEntries,
        successfulEntries,
        failedEntries,
        successRate,
        currentStreak,
        longestStreak,
        lastSevenDays,
        last30Days,
        todayStatus,
        missedYesterday,
        streakAtRisk,
      };
    });
  }, [challenges, logs]);

  // Overall stats
  const overallStats = useMemo((): OverallStats => {
    if (!habitStats.length) {
      return {
        totalHabits: 0,
        averageSuccessRate: 0,
        totalSuccesses: 0,
        totalEntries: 0,
        bestStreak: 0,
        bestStreakHabit: "",
        thisWeekSuccessRate: 0,
        lastWeekSuccessRate: 0,
        trend: 0,
        achievements: [],
        nextGoal: null,
      };
    }

    const totalHabits = habitStats.length;
    const totalSuccesses = habitStats.reduce((sum, h) => sum + h.successfulEntries, 0);
    const totalEntries = habitStats.reduce((sum, h) => sum + h.totalEntries, 0);
    const averageSuccessRate = totalEntries > 0 ? (totalSuccesses / totalEntries) * 100 : 0;

    const bestStreakHabit = habitStats.reduce((best, current) =>
      current.longestStreak > best.longestStreak ? current : best
    );
    
    // Calculate weekly trends
    const today = new Date();
    const thisWeekStart = format(subDays(today, 6), "yyyy-MM-dd");
    const lastWeekStart = format(subDays(today, 13), "yyyy-MM-dd");
    const lastWeekEnd = format(subDays(today, 7), "yyyy-MM-dd");
    
    let thisWeekSuccess = 0;
    let thisWeekTotal = 0;
    let lastWeekSuccess = 0;
    let lastWeekTotal = 0;
    
    habitStats.forEach(h => {
      h.last30Days.forEach(day => {
        if (day.date >= thisWeekStart) {
          if (day.success !== null) {
            thisWeekTotal++;
            if (day.success) thisWeekSuccess++;
          }
        } else if (day.date >= lastWeekStart && day.date <= lastWeekEnd) {
          if (day.success !== null) {
            lastWeekTotal++;
            if (day.success) lastWeekSuccess++;
          }
        }
      });
    });
    
    const thisWeekSuccessRate = thisWeekTotal > 0 ? (thisWeekSuccess / thisWeekTotal) * 100 : 0;
    const lastWeekSuccessRate = lastWeekTotal > 0 ? (lastWeekSuccess / lastWeekTotal) * 100 : 0;
    const trend = thisWeekSuccessRate - lastWeekSuccessRate;
    
    // Calculate achievements
    const achievements = calculateAchievements(habitStats, totalHabits);
    const unlockedIds = achievements.map(a => a.id);
    const nextGoal = getNextAchievement(habitStats, unlockedIds);

    return {
      totalHabits,
      averageSuccessRate,
      totalSuccesses,
      totalEntries,
      bestStreak: bestStreakHabit.longestStreak,
      bestStreakHabit: bestStreakHabit.title,
      thisWeekSuccessRate,
      lastWeekSuccessRate,
      trend,
      achievements,
      nextGoal,
    };
  }, [habitStats]);

  return {
    habitStats,
    overallStats,
    isLoading: challengesLoading || logsLoading,
  };
}
