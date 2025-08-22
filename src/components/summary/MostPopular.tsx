import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, subDays, isAfter } from "date-fns";
import { Users, Flame, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MostPopularProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
}

interface PopularChallenge {
  challengeId: string;
  title: string;
  participantCount: number;
  startDate: string;
  endDate: string;
  isTrending: boolean;
  participants: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
  }>;
}

export function MostPopular({ lang, filters }: MostPopularProps) {
  const { start, end } = useDateRange();

  const t = {
    de: {
      title: "Beliebteste Challenges",
      description: "Sortiert nach Teilnehmerzahl",
      participants: "Teilnehmer",
      trending: "Trending",
      recentlyStarted: "Kürzlich gestartet",
      noData: "Keine aktiven Challenges",
      activeSince: "Aktiv seit",
      until: "bis"
    },
    en: {
      title: "Most Popular Challenges",
      description: "Sorted by participant count",
      participants: "Participants",
      trending: "Trending",
      recentlyStarted: "Recently started",
      noData: "No active challenges",
      activeSince: "Active since",
      until: "until"
    }
  };

  const { data: popularData, isLoading } = useQuery({
    queryKey: ['most-popular', start, end, filters],
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
          challenge_type,
          start_date,
          end_date,
          created_at
        `)
        .in('group_id', groupIds)
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      if (!challenges?.length) return [];

      const challengeIds = challenges.map(c => c.id);

      // Get participants with profile info
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          user_id,
          profiles!inner(display_name, avatar_url)
        `)
        .in('challenge_id', challengeIds);

      // Calculate popularity metrics
      const trendingThreshold = subDays(new Date(), 30);
      
      const popularChallenges: PopularChallenge[] = challenges.map(challenge => {
        const challengeParticipants = participants?.filter(p => p.challenge_id === challenge.id) || [];
        const isTrending = isAfter(new Date(challenge.created_at), trendingThreshold);

        return {
          challengeId: challenge.id,
          title: challenge.title,
          participantCount: challengeParticipants.length,
          startDate: challenge.start_date,
          endDate: challenge.end_date,
          isTrending,
          participants: challengeParticipants.map(p => ({
            userId: p.user_id,
            displayName: (p.profiles as any)?.display_name || 'Unknown',
            avatarUrl: (p.profiles as any)?.avatar_url
          }))
        };
      }).filter(c => c.participantCount > 0);

      // Sort by participant count (descending)
      return popularChallenges.sort((a, b) => b.participantCount - a.participantCount);
    },
    enabled: !!start && !!end
  });

  const displayData = useMemo(() => {
    if (!popularData?.length) return [];
    return popularData.slice(0, 4); // Show top 4 for grid layout
  }, [popularData]);

  if (isLoading) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!displayData.length) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topChallenge = displayData[0];

  return (
    <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-all duration-300">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            {t[lang].title}
          </CardTitle>
          
          {/* Top challenge badge */}
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200">
            👑 {topChallenge.participantCount} {t[lang].participants}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t[lang].description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {displayData.map((challenge, index) => (
          <div 
            key={challenge.challengeId}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg hover:from-muted/50 hover:to-muted/20 transition-all duration-200 cursor-pointer"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground line-clamp-1">
                  {challenge.title}
                </h4>
                {challenge.isTrending && (
                  <Badge variant="destructive" className="text-xs bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200">
                    <Flame className="w-3 h-3 mr-1" />
                    {t[lang].trending}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(challenge.startDate), 'dd.MM')} - {format(new Date(challenge.endDate), 'dd.MM')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{challenge.participantCount} {t[lang].participants}</span>
                </div>
              </div>
            </div>

            {/* Participant avatars */}
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {challenge.participants.slice(0, 4).map((participant, pIndex) => (
                  <Avatar key={participant.userId} className="w-6 h-6 border border-background">
                    <AvatarImage src={participant.avatarUrl} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {participant.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {challenge.participants.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-muted border border-background flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">+{challenge.participants.length - 4}</span>
                  </div>
                )}
              </div>
              
              {/* Rank indicator */}
              <div className="ml-3 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}