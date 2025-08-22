import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDateRange } from "@/contexts/DateRangeContext";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Activity, AlertTriangle, UserPlus, Calendar, DollarSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityFeedProps {
  lang: 'de' | 'en';
  filters?: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
}

interface ActivityEvent {
  id: string;
  type: 'violation' | 'join' | 'challenge_start' | 'challenge_end';
  userId?: string;
  userName?: string;
  userAvatar?: string;
  challengeId?: string;
  challengeName?: string;
  amount?: number;
  timestamp: string;
  description: string;
  icon: React.ReactNode;
  badgeColor: string;
}

export function ActivityFeed({ lang, filters }: ActivityFeedProps) {
  const { start, end } = useDateRange();
  const locale = lang === 'de' ? de : enUS;

  const t = {
    de: {
      title: "Aktivitäts-Feed",
      description: "Neueste Ereignisse und Updates",
      violation: "Verstoß",
      joined: "ist beigetreten",
      started: "gestartet",
      ended: "beendet",
      penalty: "Strafe",
      noActivity: "Keine Aktivitäten im gewählten Zeitraum",
      challenge: "Challenge",
      ago: "vor"
    },
    en: {
      title: "Activity Feed",
      description: "Latest events and updates",
      violation: "Violation",
      joined: "joined",
      started: "started",
      ended: "ended",
      penalty: "Penalty",
      noActivity: "No activities in selected period",
      challenge: "Challenge",
      ago: "ago"
    }
  };

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed', start, end, filters],
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

      // Get challenges for context
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id, title, start_date, end_date')
        .in('group_id', groupIds);

      // Get profiles for user info
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url');

      const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const challengesMap = Object.fromEntries((challenges || []).map(c => [c.id, c]));

      // Collect all activities
      const allEvents: ActivityEvent[] = [];

      // 1. Violations
      const { data: violations } = await supabase
        .from('challenge_violations')
        .select('id, challenge_id, user_id, created_at, amount_cents')
        .gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(50);

      violations?.forEach(violation => {
        const challenge = challengesMap[violation.challenge_id];
        const profile = profilesMap[violation.user_id];
        if (challenge && profile) {
          allEvents.push({
            id: `violation-${violation.id}`,
            type: 'violation',
            userId: violation.user_id,
            userName: profile.display_name,
            userAvatar: profile.avatar_url,
            challengeId: violation.challenge_id,
            challengeName: challenge.title,
            amount: violation.amount_cents,
            timestamp: violation.created_at,
            description: `${profile.display_name} ${t[lang].violation} in ${challenge.title}`,
            icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
            badgeColor: 'destructive'
          });
        }
      });

      // 2. New participants (joins)
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('id, challenge_id, user_id, created_at')
        .gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(30);

      participants?.forEach(participant => {
        const challenge = challengesMap[participant.challenge_id];
        const profile = profilesMap[participant.user_id];
        if (challenge && profile) {
          allEvents.push({
            id: `join-${participant.id}`,
            type: 'join',
            userId: participant.user_id,
            userName: profile.display_name,
            userAvatar: profile.avatar_url,
            challengeId: participant.challenge_id,
            challengeName: challenge.title,
            timestamp: participant.created_at,
            description: `${profile.display_name} ${t[lang].joined} ${challenge.title}`,
            icon: <UserPlus className="w-4 h-4 text-green-500" />,
            badgeColor: 'secondary'
          });
        }
      });

      // 3. Challenge starts/ends
      const recentDate = subDays(new Date(), 7);
      challenges?.forEach(challenge => {
        const challengeStart = new Date(challenge.start_date);
        const challengeEnd = new Date(challenge.end_date);

        // Challenge started recently
        if (challengeStart >= recentDate && challengeStart <= new Date()) {
          allEvents.push({
            id: `start-${challenge.id}`,
            type: 'challenge_start',
            challengeId: challenge.id,
            challengeName: challenge.title,
            timestamp: format(challengeStart, "yyyy-MM-dd'T'HH:mm:ss"),
            description: `${t[lang].challenge} "${challenge.title}" ${t[lang].started}`,
            icon: <Calendar className="w-4 h-4 text-blue-500" />,
            badgeColor: 'outline'
          });
        }

        // Challenge ended recently
        if (challengeEnd >= recentDate && challengeEnd <= new Date()) {
          allEvents.push({
            id: `end-${challenge.id}`,
            type: 'challenge_end',
            challengeId: challenge.id,
            challengeName: challenge.title,
            timestamp: format(challengeEnd, "yyyy-MM-dd'T'HH:mm:ss"),
            description: `${t[lang].challenge} "${challenge.title}" ${t[lang].ended}`,
            icon: <Calendar className="w-4 h-4 text-orange-500" />,
            badgeColor: 'outline'
          });
        }
      });

      // Sort all events by timestamp (newest first) and limit to 15
      return allEvents
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);
    },
    enabled: !!start && !!end
  });

  if (isLoading) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!activities?.length) {
    return (
      <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {t[lang].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {t[lang].noActivity}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-all duration-300">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {t[lang].title}
          </CardTitle>
          
          {/* Activity count badge */}
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200">
            📊 {activities.length} events
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t[lang].description}</p>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-muted/20 to-muted/10 rounded-lg hover:from-muted/30 hover:to-muted/15 transition-all duration-200"
              >
                {/* Avatar or Icon */}
                <div className="flex-shrink-0">
                  {activity.userAvatar || activity.userName ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={activity.userAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {activity.userName?.substring(0, 2).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                      {activity.icon}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {activity.icon}
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {activity.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(activity.timestamp), { 
                        addSuffix: true, 
                        locale 
                      })}
                    </span>
                    
                    {activity.amount && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium text-red-600">
                            €{(activity.amount / 100).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Type indicator */}
                <div className="flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'violation' ? 'bg-red-500' :
                    activity.type === 'join' ? 'bg-green-500' :
                    'bg-blue-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}