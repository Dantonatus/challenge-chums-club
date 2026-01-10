import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionRingsProps {
  habits: Array<{
    challengeId: string;
    title: string;
    successRate: number;
    totalEntries: number;
    successfulEntries: number;
  }>;
  lang: "de" | "en";
}

const t = {
  de: {
    title: "Completion Rate",
    noData: "Keine Daten",
    of: "von",
    entries: "Einträgen",
  },
  en: {
    title: "Completion Rate",
    noData: "No data",
    of: "of",
    entries: "entries",
  },
};

function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 8,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 80) return "text-green-500";
    if (pct >= 60) return "text-emerald-400";
    if (pct >= 40) return "text-amber-400";
    if (pct >= 20) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500", getColor(percentage))}
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

export function CompletionRings({ habits, lang }: CompletionRingsProps) {
  const labels = t[lang];

  // Calculate overall stats
  const totalEntries = habits.reduce((sum, h) => sum + h.totalEntries, 0);
  const totalSuccess = habits.reduce((sum, h) => sum + h.successfulEntries, 0);
  const overallRate = totalEntries > 0 ? (totalSuccess / totalEntries) * 100 : 0;

  // Get top 4 habits for display
  const displayHabits = habits.slice(0, 4);

  if (!habits.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4" />
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
          <PieChart className="h-4 w-4" />
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Ring */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <ProgressRing percentage={overallRate} size={100} strokeWidth={10} />
            <p className="text-sm text-muted-foreground mt-2">
              {totalSuccess} {labels.of} {totalEntries} {labels.entries}
            </p>
          </div>
        </div>

        {/* Individual Habit Rings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {displayHabits.map((habit) => (
            <div key={habit.challengeId} className="text-center">
              <ProgressRing percentage={habit.successRate} size={60} strokeWidth={6} />
              <p className="text-xs text-muted-foreground mt-2 truncate" title={habit.title}>
                {habit.title}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
