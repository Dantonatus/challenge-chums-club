import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, AlertTriangle, Activity } from "lucide-react";
import { useState } from "react";

interface ProfileActivityFeedProps {
  userId: string | null;
  dateRange: { start: Date; end: Date };
  t: any;
}

export function ProfileActivityFeed({ 
  userId, 
  dateRange, 
  t 
}: ProfileActivityFeedProps) {
  const [filter, setFilter] = useState<'all' | 'my-actions' | 'group-events'>('all');

  const { data: activityData, isLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["profile", "activity", userId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const [violationsResult, groupJoinsResult] = await Promise.all([
        // Get user's violations
        supabase
          .from("challenge_violations")
          .select(`
            id, date, amount_cents,
            challenges!inner(title)
          `)
          .eq("user_id", userId!)
          .gte("date", dateRange.start.toISOString().split('T')[0])
          .lte("date", dateRange.end.toISOString().split('T')[0])
          .order("date", { ascending: false }),

        // Get group membership activities
        supabase
          .from("challenge_participants")
          .select(`
            created_at, user_id,
            challenges!inner(title, created_by),
            profiles!inner(display_name)
          `)
          .eq("challenges.created_by", userId!)
          .neq("user_id", userId!)
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString())
          .order("created_at", { ascending: false })
      ]);

      const activities = [];

      // Add violations
      if (violationsResult.data) {
        violationsResult.data.forEach(violation => {
          activities.push({
            id: `violation-${violation.id}`,
            type: 'violation',
            timestamp: new Date(violation.date),
            description: `You added a violation in ${(violation as any).challenges?.title || 'Unknown Challenge'}`,
            details: `−€${(violation.amount_cents / 100).toFixed(2)}`,
            category: 'my-actions'
          });
        });
      }

      // Add group joins  
      if (groupJoinsResult.data) {
        groupJoinsResult.data.forEach(join => {
          activities.push({
            id: `join-${join.user_id}`,
            type: 'group-join',
            timestamp: new Date(join.created_at),
            description: `${(join as any).profiles?.display_name || 'Someone'} joined your challenge "${(join as any).challenges?.title}"`,
            details: null,
            category: 'group-events'
          });
        });
      }

      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t.activityFeed}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const filteredActivities = activityData?.filter(activity => {
    if (filter === 'all') return true;
    return activity.category === filter;
  }) || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'violation':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'group-join':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t.activityFeed}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'my-actions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('my-actions')}
            >
              My Actions
            </Button>
            <Button
              variant={filter === 'group-events' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('group-events')}
            >
              Group Events
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity found for the selected period and filter.
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredActivities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.description}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                    {activity.details && (
                      <span className="text-xs font-medium text-destructive">
                        {activity.details}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}