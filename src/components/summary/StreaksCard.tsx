import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, subDays, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Zap, AlertTriangle, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StreaksCardProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
}

interface StreakData {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  challengeId: string;
  challengeTitle: string;
  currentStreak: number;
  longestStreak: number;
  isAtRisk: boolean;
  recentFailPattern: number[]; // Last 7 days fail counts
}

export function StreaksCard({ lang, filters }: StreaksCardProps) {
  const { start, end } = useDateRange();

  const t = {
    de: {
      title: "Streaks & Risiken",
      description: "Aktuelle Erfolgsserien und Risikomuster",
      currentStreak: "Aktuelle Serie",
      longestStreak: "Längste Serie",
      atRisk: "Gefährdet",
      days: "Tage",
      noData: "Keine Streak-Daten",
      champion: "Champion",
      riskPattern: "Risiko erkannt"
    },
    en: {
      title: "Streaks & Risks",
      description: "Current success streaks and risk patterns",
      currentStreak: "Current Streak",
      longestStreak: "Longest Streak",
      atRisk: "At Risk",
      days: "days",
      noData: "No streak data",
      champion: "Champion",
      riskPattern: "Risk detected"
    }
  };

  const { data: streakData, isLoading } = useQuery({
    queryKey: ['streaks', start, end, filters],
    queryFn: async () => {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Get user's groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (!userGroups?.length) return [];

      const groupIds = userGroups.map(g => g.group_id);

      // Get challenges in date range
      const { data: challenges } = await supabase
        .from('challenges')
        .select(`
          id,
          title,
          start_date,
          end_date
        `)
        .in('group_id', groupIds)
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      if (!challenges?.length) return [];

      const challengeIds = challenges.map(c => c.id);

      // Get participants with profiles
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          user_id,
          profiles!inner(display_name, avatar_url)
        `)
        .in('challenge_id', challengeIds);

      // Get violations for last 14 days (to detect patterns)
      const twoWeeksAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('challenge_id, user_id, created_at')
        .in('challenge_id', challengeIds)
        .gte('created_at', `${twoWeeksAgo}T00:00:00`)
        .lte('created_at', `${format(new Date(), 'yyyy-MM-dd')}T23:59:59`);

      // Calculate streaks for each participant-challenge combination
      const streakCalculations: StreakData[] = [];

      participants?.forEach(participant => {
        const challenge = challenges.find(c => c.id === participant.challenge_id);
        if (!challenge) return;

        const participantViolations = violations?.filter(v => 
          v.challenge_id === participant.challenge_id && 
          v.user_id === participant.user_id
        ) || [];

        // Calculate streaks by checking consecutive days without violations
        const today = new Date();
        const challengeStart = new Date(challenge.start_date);
        const streakStart = new Date(Math.max(challengeStart.getTime(), subDays(today, 30).getTime()));
        
        const days = eachDayOfInterval({ start: streakStart, end: today });
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        // Check each day for violations
        const daysFails = days.map(day => {
          const dayViolations = participantViolations.filter(v => 
            isWithinInterval(new Date(v.created_at), { 
              start: startOfDay(day), 
              end: endOfDay(day) 
            })
          );
          return dayViolations.length;
        });

        // Calculate current streak (from today backwards)
        for (let i = daysFails.length - 1; i >= 0; i--) {
          if (daysFails[i] === 0) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate longest streak
        for (let i = 0; i < daysFails.length; i++) {
          if (daysFails[i] === 0) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }

        // Risk detection: increasing fails in last 7 days
        const last7Days = daysFails.slice(-7);
        const firstHalf = last7Days.slice(0, 3).reduce((a, b) => a + b, 0);
        const secondHalf = last7Days.slice(4).reduce((a, b) => a + b, 0);
        const isAtRisk = secondHalf > firstHalf && secondHalf > 1;

        streakCalculations.push({
          userId: participant.user_id,
          displayName: (participant.profiles as any)?.display_name || 'Unknown',
          avatarUrl: (participant.profiles as any)?.avatar_url,
          challengeId: participant.challenge_id,
          challengeTitle: challenge.title,
          currentStreak,
          longestStreak,
          isAtRisk,
          recentFailPattern: last7Days
        });
      });

      // Sort by current streak (descending) and then by longest streak
      return streakCalculations.sort((a, b) => {
        if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
        return b.longestStreak - a.longestStreak;
      });
    },
    enabled: !!start && !!end
  });

  const displayData = useMemo(() => {
    if (!streakData?.length) return { topStreaks: [], atRiskUsers: [] };
    
    const topStreaks = streakData.slice(0, 3);
    const atRiskUsers = streakData.filter(s => s.isAtRisk).slice(0, 3);
    
    return { topStreaks, atRiskUsers };
  }, [streakData]);

  if (isLoading) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!displayData.topStreaks.length && !displayData.atRiskUsers.length) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topStreak = displayData.topStreaks[0];

  return (
    <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-all duration-300">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            {t[lang].title}
          </CardTitle>
          
          {/* Top streak badge */}
          {topStreak && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200">
              ⚡ {topStreak.currentStreak} {t[lang].days}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t[lang].description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top Streaks */}
        {displayData.topStreaks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              {t[lang].champion}
            </h4>
            {displayData.topStreaks.map((streak, index) => (
              <div 
                key={`${streak.userId}-${streak.challengeId}`}
                className="flex items-center justify-between p-2 bg-gradient-to-r from-yellow-50/50 to-yellow-100/30 dark:from-yellow-950/30 dark:to-yellow-900/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={streak.avatarUrl} />
                    <AvatarFallback className="bg-yellow-100 text-yellow-800 text-xs">
                      {streak.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{streak.displayName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {streak.challengeTitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-yellow-600" />
                    <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      {streak.currentStreak}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max: {streak.longestStreak}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* At Risk Users */}
        {displayData.atRiskUsers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              {t[lang].atRisk}
            </h4>
            {displayData.atRiskUsers.map((risk, index) => (
              <div 
                key={`${risk.userId}-${risk.challengeId}-risk`}
                className="flex items-center justify-between p-2 bg-gradient-to-r from-red-50/50 to-red-100/30 dark:from-red-950/30 dark:to-red-900/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={risk.avatarUrl} />
                    <AvatarFallback className="bg-red-100 text-red-800 text-xs">
                      {risk.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{risk.displayName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {risk.challengeTitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200">
                    ⚠️ {t[lang].riskPattern}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t[lang].currentStreak}: {risk.currentStreak}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}