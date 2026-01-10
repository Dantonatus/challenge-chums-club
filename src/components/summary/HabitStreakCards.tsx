import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface HabitStats {
  challengeId: string;
  title: string;
  currentStreak: number;
  longestStreak: number;
  successRate: number;
}

interface HabitStreakCardsProps {
  habits: HabitStats[];
  lang: "de" | "en";
}

const t = {
  de: {
    currentStreak: "Aktuelle Serie",
    longestStreak: "Rekord",
    days: "Tage",
    day: "Tag",
    successRate: "Erfolgsquote",
    noHabits: "Keine aktiven Habits",
  },
  en: {
    currentStreak: "Current Streak",
    longestStreak: "Record",
    days: "days",
    day: "day",
    successRate: "Success Rate",
    noHabits: "No active habits",
  },
};

export function HabitStreakCards({ habits, lang }: HabitStreakCardsProps) {
  const labels = t[lang];

  if (!habits.length) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          {labels.noHabits}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {habits.map((habit) => (
        <Link key={habit.challengeId} to={`/challenges/${habit.challengeId}`}>
          <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardContent className="pt-5 pb-4">
              {/* Title */}
              <h3 className="font-semibold text-sm truncate mb-3 text-foreground">
                {habit.title}
              </h3>

              {/* Streak Display */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full",
                    habit.currentStreak > 0
                      ? "bg-gradient-to-br from-orange-400 to-red-500"
                      : "bg-muted"
                  )}
                >
                  <Flame
                    className={cn(
                      "h-6 w-6",
                      habit.currentStreak > 0
                        ? "text-white animate-pulse"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {habit.currentStreak}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {habit.currentStreak === 1 ? labels.day : labels.days}
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    {labels.longestStreak}: {habit.longestStreak}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp
                    className={cn(
                      "h-3.5 w-3.5",
                      habit.successRate >= 70
                        ? "text-green-500"
                        : habit.successRate >= 40
                        ? "text-amber-500"
                        : "text-red-500"
                    )}
                  />
                  <span
                    className={cn(
                      "font-medium",
                      habit.successRate >= 70
                        ? "text-green-600 dark:text-green-400"
                        : habit.successRate >= 40
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {Math.round(habit.successRate)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
