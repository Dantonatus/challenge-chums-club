import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, TrendingUp, TrendingDown, Award, AlertCircle, Flame, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface OverallStats {
  totalHabits: number;
  averageSuccessRate: number;
  totalSuccesses: number;
  totalEntries: number;
  bestStreak: number;
  bestStreakHabit: string;
  trend?: number;
}

interface HabitStats {
  challengeId: string;
  title: string;
  successRate: number;
  currentStreak: number;
}

interface MotivationalInsightsProps {
  overallStats: OverallStats;
  habitStats: HabitStats[];
  lang: "de" | "en";
}

const t = {
  de: {
    title: "Insights",
    noHabits: "Starte dein erstes Habit!",
    createHabit: "Habit erstellen",
    goToEntry: "Jetzt eintragen",
    greatJob: "Super Arbeit! 🎉",
    keepGoing: "Weiter so! 💪",
    focusNeeded: "Fokus-Empfehlung",
    bestStreak: "Längster Streak",
    days: "Tage",
    successRate: "Erfolgsquote",
    suggestion: "Tipp",
    betterThanLastWeek: "besser als letzte Woche!",
    worseThanLastWeek: "weniger als letzte Woche",
    suggestions: {
      excellent: "Du bist auf einem großartigen Weg! Halte deine Routinen aufrecht.",
      good: "Gute Fortschritte! Konzentriere dich auf Konsistenz.",
      needsWork: "Versuche, jeden Tag kleine Schritte zu machen.",
      focus: "Fokussiere dich besonders auf:",
    },
    implementationTips: {
      morning: "Morgens ist deine Power-Zeit! Erledige Habits vor 10 Uhr.",
      evening: "Abend-Routinen funktionieren am besten nach dem Abendessen.",
      stack: "Verknüpfe Habits: Mache sie direkt nach etwas, das du sowieso täglich tust.",
    },
  },
  en: {
    title: "Insights",
    noHabits: "Start your first habit!",
    createHabit: "Create Habit",
    goToEntry: "Log Now",
    greatJob: "Great job! 🎉",
    keepGoing: "Keep going! 💪",
    focusNeeded: "Focus Needed",
    bestStreak: "Best Streak",
    days: "days",
    successRate: "Success Rate",
    suggestion: "Tip",
    betterThanLastWeek: "better than last week!",
    worseThanLastWeek: "down from last week",
    suggestions: {
      excellent: "You're on an amazing track! Keep your routines going.",
      good: "Good progress! Focus on consistency.",
      needsWork: "Try to take small steps every day.",
      focus: "Pay special attention to:",
    },
    implementationTips: {
      morning: "Morning is your power hour! Consider doing your habits before 10am.",
      evening: "Evening routines work best when you pair them with existing habits like dinner.",
      stack: "Stack your habits: do them right after something you already do daily.",
    },
  },
};

export function MotivationalInsights({
  overallStats,
  habitStats,
  lang,
}: MotivationalInsightsProps) {
  const labels = t[lang];

  // Find habit needing most attention (lowest success rate with some entries)
  const habitNeedingFocus = habitStats
    .filter((h) => h.successRate < 60)
    .sort((a, b) => a.successRate - b.successRate)[0];

  // Find best performing habit
  const bestHabit = habitStats
    .filter((h) => h.successRate > 0)
    .sort((a, b) => b.successRate - a.successRate)[0];

  // Determine motivation message
  const getMotivationMessage = (): { type: string; message: string; icon: React.ReactNode } => {
    const trend = overallStats.trend || 0;
    const rate = overallStats.averageSuccessRate;
    
    if (trend > 10) {
      return { 
        type: "excellent", 
        message: `+${Math.round(trend)}% ${labels.betterThanLastWeek}`,
        icon: <TrendingUp className="h-4 w-4 text-green-500" />
      };
    }
    if (trend < -10) {
      return { 
        type: "needsWork", 
        message: `${Math.round(trend)}% ${labels.worseThanLastWeek}`,
        icon: <TrendingDown className="h-4 w-4 text-amber-500" />
      };
    }
    
    if (rate >= 80) {
      return { type: "excellent", message: labels.suggestions.excellent, icon: <Award className="h-4 w-4 text-green-500" /> };
    }
    if (rate >= 50) {
      return { type: "good", message: labels.suggestions.good, icon: <TrendingUp className="h-4 w-4 text-amber-500" /> };
    }
    return { type: "needsWork", message: labels.suggestions.needsWork, icon: <AlertCircle className="h-4 w-4 text-blue-500" /> };
  };
  
  const getImplementationTip = (): string => {
    const hour = new Date().getHours();
    const tips = labels.implementationTips;
    if (hour < 12) return tips.morning;
    if (hour < 18) return tips.stack;
    return tips.evening;
  };

  const motivation = getMotivationMessage();
  const implementationTip = getImplementationTip();

  if (!overallStats.totalHabits) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium mb-4">{labels.noHabits}</p>
          <Link to="/app/challenges">
            <Button>
              {labels.createHabit}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{labels.title}</h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Success Rate */}
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div
              className={cn(
                "text-2xl font-bold",
                overallStats.averageSuccessRate >= 70
                  ? "text-green-600 dark:text-green-400"
                  : overallStats.averageSuccessRate >= 40
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {Math.round(overallStats.averageSuccessRate)}%
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {labels.successRate}
            </div>
          </div>

          {/* Best Streak */}
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
              <Flame className="h-5 w-5 text-orange-500" />
              {overallStats.bestStreak}
            </div>
            <div className="text-xs text-muted-foreground">{labels.bestStreak}</div>
          </div>
        </div>

        {/* Motivation Message */}
        <div
          className={cn(
            "rounded-lg p-3 mb-3",
            motivation.type === "excellent"
              ? "bg-green-500/10 border border-green-500/20"
              : motivation.type === "good"
              ? "bg-amber-500/10 border border-amber-500/20"
              : "bg-blue-500/10 border border-blue-500/20"
          )}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5">{motivation.icon}</div>
            <p className="text-sm text-foreground">{motivation.message}</p>
          </div>
        </div>
        
        {/* Implementation Intention Tip */}
        <div className="bg-muted/30 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{implementationTip}</p>
          </div>
        </div>

        {/* Focus Habit (if needed) */}
        {habitNeedingFocus && (
          <div className="bg-red-500/10 rounded-lg p-3 mb-3 border border-red-500/20">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {labels.focusNeeded}
            </div>
            <p className="text-sm font-medium text-foreground">
              {habitNeedingFocus.title} ({Math.round(habitNeedingFocus.successRate)}%)
            </p>
          </div>
        )}

        {/* CTA Button */}
        <Link to="/app/entry">
          <Button className="w-full" size="sm">
            {labels.goToEntry}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
