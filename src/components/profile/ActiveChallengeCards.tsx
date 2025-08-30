import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Euro, AlertTriangle } from "lucide-react";
import { format, differenceInDays, max, min } from "date-fns";
import { formatEUR } from "@/lib/currency";
import { useNavigate } from "react-router-dom";

interface ActiveChallengeCardsProps {
  challengesData: any;
  dateRange: { start: Date; end: Date };
  loading: boolean;
  t: any;
}

export function ActiveChallengeCards({ 
  challengesData, 
  dateRange, 
  loading, 
  t 
}: ActiveChallengeCardsProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{t.activeChallenges}</h3>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!challengesData || challengesData.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{t.activeChallenges}</h3>
        <Card className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              No active challenges in the selected period
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter active challenges in the date range
  const activeChallenges = challengesData.filter((challenge: any) => {
    const challengeStart = new Date(challenge.start_date);
    const challengeEnd = new Date(challenge.end_date);
    return challengeStart <= dateRange.end && challengeEnd >= dateRange.start;
  });

  return (
    <div id="participants-section" className="space-y-4">
      <h3 className="text-xl font-semibold">{t.activeChallenges}</h3>
      <div className="grid gap-4">
        {activeChallenges.map((challenge: any) => {
          const challengeStart = new Date(challenge.start_date);
          const challengeEnd = new Date(challenge.end_date);
          
          // Calculate progress within the selected date range
          const effectiveStart = max([challengeStart, dateRange.start]);
          const effectiveEnd = min([challengeEnd, dateRange.end]);
          const totalDays = differenceInDays(challengeEnd, challengeStart) + 1;
          const completedDays = differenceInDays(new Date(), challengeStart) + 1;
          const progressPercentage = Math.min(100, Math.max(0, (completedDays / totalDays) * 100));

          // Count violations and penalties in the selected period
          const violations = (challenge.challenge_violations || []).filter((v: any) => {
            const violationDate = new Date(v.date);
            return violationDate >= dateRange.start && violationDate <= dateRange.end;
          });

          const kpiMisses = (challenge.kpi_measurements || []).filter((m: any) => {
            const measurementDate = new Date(m.date);
            return measurementDate >= dateRange.start && 
                   measurementDate <= dateRange.end &&
                   m.measured_value < m.target_value;
          });

          const totalViolations = violations.length + kpiMisses.length;
          const totalPenalties = violations.reduce((sum: number, v: any) => sum + (v.amount_cents || 0), 0) +
                                kpiMisses.length * (challenge.penalty_amount || 0);

          return (
            <Card 
              key={challenge.id}
              className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(challengeStart, 'MMM dd, yyyy')} - {format(challengeEnd, 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Badge variant={progressPercentage > 75 ? "default" : "secondary"}>
                    {progressPercentage.toFixed(0)}% Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{completedDays} / {totalDays} days</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <div className="text-sm">
                      <div className="font-medium">{totalViolations}</div>
                      <div className="text-muted-foreground">Violations</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-red-500" />
                    <div className="text-sm">
                      <div className="font-medium">{formatEUR(totalPenalties)}</div>
                      <div className="text-muted-foreground">Penalties</div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/app/challenges/${challenge.id}`)}
                  className="w-full"
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}