import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Calendar, TrendingUp } from "lucide-react";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface MostPopularByDurationProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
}

interface DurationChallenge {
  id: string;
  title: string;
  duration_days: number;
  participant_count: number;
  total_fails: number;
  fail_rate_pct: number;
  start_date: string;
  participants: Array<{ user_id: string; display_name: string; avatar_url?: string }>;
  is_trending: boolean;
}

export const MostPopularByDuration = ({ lang, filters }: MostPopularByDurationProps) => {
  const { start, end } = useDateRange();
  const navigate = useNavigate();
  
  const t = {
    de: {
      title: "Beliebteste Challenges",
      description: "Challenges mit der längsten Laufzeit im gewählten Zeitraum",
      participants: "Teilnehmer",
      duration: "Dauer",
      days: "Tagen",
      violations: "Verstöße",
      trending: "Trending",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Most Popular Challenges",
      description: "Challenges with the longest duration in the selected period",
      participants: "Participants",
      duration: "Duration",
      days: "days",
      violations: "Violations",
      trending: "Trending",
      noData: "No challenges for the selected period"
    }
  };

  const { data: challengeData, isLoading } = useQuery({
    queryKey: ['popular-challenges-by-duration', start, end, filters],
    queryFn: async () => {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Get user's groups
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (!userGroups || userGroups.length === 0) return [];

      // Filter by selected groups or use all user groups
      const availableGroupIds = userGroups.map(g => g.group_id);
      const groupIds = filters?.groups?.length 
        ? availableGroupIds.filter(id => filters.groups!.includes(id))
        : availableGroupIds;

      if (groupIds.length === 0) return [];

      // Execute the duration-based ranking query
      const { data, error } = await supabase.rpc('get_popular_challenges_by_duration', {
        p_start_date: startStr,
        p_end_date: endStr,
        p_group_ids: groupIds
      });

      if (error) {
        console.error('Error fetching popular challenges by duration:', error);
        return [];
      }

      let challenges = data || [];

      // Apply participant filter if specified
      if (filters?.participants?.length) {
        challenges = challenges.filter(challenge => 
          challenge.participants.some((p: any) => 
            filters.participants!.includes(p.user_id)
          )
        );

        // Recalculate participant count and stats for filtered participants
        challenges = challenges.map(challenge => ({
          ...challenge,
          participants: challenge.participants.filter((p: any) => 
            filters.participants!.includes(p.user_id)
          ),
          participant_count: challenge.participants.filter((p: any) => 
            filters.participants!.includes(p.user_id)
          ).length
        }));
      }

      // Apply challenge type filter if specified
      if (filters?.challengeTypes?.length) {
        // We'd need to add challenge_type to the RPC response or fetch it separately
        // For now, we'll skip this filter as it's not in the current RPC
      }

      return challenges;
    },
    enabled: !!start && !!end
  });

  // Create exactly 10 rows (real data + placeholders)
  const displayData = useMemo(() => {
    const challenges = challengeData || [];
    const rows: Array<DurationChallenge | null> = [];
    
    // Add real challenges (up to 10)
    for (let i = 0; i < 10; i++) {
      if (i < challenges.length) {
        rows.push(challenges[i]);
      } else {
        rows.push(null); // placeholder
      }
    }
    
    return rows;
  }, [challengeData]);

  const handleChallengeClick = (challengeId: string) => {
    navigate(`/challenges/${challengeId}`);
  };

  if (isLoading) {
    return (
      <Card className="col-span-12 w-full shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-3" />
            <CardTitle className="text-lg">{t[lang].title}</CardTitle>
          </div>
          <CardDescription>{t[lang].description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-12 w-full shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-chart-3" />
          <CardTitle className="text-lg">{t[lang].title}</CardTitle>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {displayData.map((challenge, index) => (
            <div 
              key={challenge?.id || `placeholder-${index}`}
              className={`
                flex items-center gap-4 px-6 py-4 transition-all duration-200
                ${challenge ? 'hover:bg-muted/30 cursor-pointer' : 'opacity-60'}
                ${index < displayData.length - 1 ? 'border-b border-border/30' : ''}
              `}
              onClick={challenge ? () => handleChallengeClick(challenge.id) : undefined}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Rank */}
              <div className="flex items-center gap-2 w-12">
                {index === 0 && challenge && <Trophy className="h-4 w-4 text-yellow-500" />}
                <span className="text-sm font-medium text-muted-foreground">
                  #{index + 1}
                </span>
              </div>

              {/* Title and Meta */}
              <div className="flex-1 min-w-0">
                {challenge ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{challenge.title}</h4>
                      {challenge.is_trending && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
                          🔥 {t[lang].trending}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{t[lang].duration}: {challenge.duration_days} {t[lang].days}</span>
                      <span>{t[lang].participants}: {challenge.participant_count}</span>
                      <span>{t[lang].violations}: {challenge.total_fails}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-4 mb-1">
                      <span className="text-sm text-muted-foreground">—</span>
                    </div>
                    <div className="h-3">
                      <span className="text-xs text-muted-foreground">—</span>
                    </div>
                  </>
                )}
              </div>

              {/* Avatar Stack */}
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {challenge ? (
                    <>
                      {challenge.participants.slice(0, 3).map((participant, idx) => (
                        <Avatar key={participant.user_id} className="h-8 w-8 border-2 border-background">
                          <AvatarImage 
                            src={participant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.user_id}`} 
                          />
                          <AvatarFallback className="text-xs">
                            {participant.display_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {challenge.participant_count > 3 && (
                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-xs font-medium">+{challenge.participant_count - 3}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    // Placeholder avatars
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className="h-8 w-8 rounded-full bg-muted/40 border-2 border-background"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};