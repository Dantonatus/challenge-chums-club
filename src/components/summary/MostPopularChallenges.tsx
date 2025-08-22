import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flame, Users, Trophy } from "lucide-react";

interface MostPopularChallengesProps {
  data: Array<{
    challenges: Array<{
      id: string;
      title: string;
      challenge_type: 'habit' | 'kpi';
      participants: Array<{ user_id: string; display_name: string }>;
      violationCount: number;
      totalViolationAmount: number;
    }>;
  }>;
  lang: 'de' | 'en';
}

export const MostPopularChallenges = ({ data, lang }: MostPopularChallengesProps) => {
  const t = {
    de: {
      title: "Beliebteste Challenges",
      description: "Challenges mit den meisten Teilnehmern",
      participants: "Teilnehmer",
      trending: "Trending",
      violations: "Verstöße",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Most Popular Challenges",
      description: "Challenges with the most participants",
      participants: "Participants",
      trending: "Trending",
      violations: "Violations",
      noData: "No challenges for the selected period"
    }
  };

  const popularChallenges = useMemo(() => {
    if (!data || data.length === 0) return [];

    const challengeStats = new Map();

    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        const key = challenge.id;
        const participantCount = challenge.participants?.length || 0;
        
        if (participantCount > 0) {
          challengeStats.set(key, {
            id: challenge.id,
            title: challenge.title,
            type: challenge.challenge_type,
            participants: challenge.participants || [],
            participantCount,
            violations: challenge.violationCount || 0,
            totalPenalties: (challenge.totalViolationAmount || 0) / 100,
            // Consider trending if high participation and recent activity
            isTrending: participantCount >= 3 && (challenge.violationCount || 0) > 0
          });
        }
      });
    });

    return Array.from(challengeStats.values())
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 5); // Top 5 popular challenges
  }, [data]);

  if (popularChallenges.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-chart-3" />
            <CardTitle className="text-lg">{t[lang].title}</CardTitle>
          </div>
          <CardDescription>{t[lang].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t[lang].noData}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300 hover-scale">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-chart-3" />
          <CardTitle className="text-lg">{t[lang].title}</CardTitle>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {popularChallenges.map((challenge, index) => (
            <div 
              key={challenge.id} 
              className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all duration-200 hover-scale"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                  <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{challenge.title}</h4>
                    {challenge.isTrending && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {t[lang].trending}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{t[lang].participants}: {challenge.participantCount}</span>
                    <span>{t[lang].violations}: {challenge.violations}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {challenge.participants.slice(0, 4).map((participant, idx) => (
                    <Avatar key={participant.user_id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.user_id}`} />
                      <AvatarFallback className="text-xs">
                        {participant.display_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {challenge.participantCount > 4 && (
                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs font-medium">+{challenge.participantCount - 4}</span>
                    </div>
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