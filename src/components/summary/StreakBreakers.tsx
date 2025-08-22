import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, X, TrendingDown } from "lucide-react";

interface StreakBreakersProps {
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

export const StreakBreakers = ({ data, lang }: StreakBreakersProps) => {
  const t = {
    de: {
      title: "Streak-Breaker",
      description: "Challenges mit den häufigsten Streak-Unterbrechungen",
      participants: "Teilnehmer",
      violations: "Verstöße",
      avgViolations: "Ø Verstöße/Person",
      high: "Hoch",
      medium: "Mittel",
      low: "Niedrig",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Streak Breakers",
      description: "Challenges with the most frequent streak breaks",
      participants: "Participants",
      violations: "Violations",
      avgViolations: "Avg Violations/Person",
      high: "High",
      medium: "Medium", 
      low: "Low",
      noData: "No challenges for the selected period"
    }
  };

  const streakBreakerData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const challengeStats = new Map();

    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        const key = challenge.id;
        const participantCount = challenge.participants?.length || 0;
        const violationCount = challenge.violationCount || 0;
        const avgViolationsPerPerson = participantCount > 0 ? violationCount / participantCount : 0;
        
        if (violationCount > 0) {
          challengeStats.set(key, {
            id: challenge.id,
            title: challenge.title,
            type: challenge.challenge_type,
            participants: participantCount,
            violations: violationCount,
            avgViolationsPerPerson,
            // Determine streak break severity
            severity: avgViolationsPerPerson >= 3 ? 'high' : avgViolationsPerPerson >= 1.5 ? 'medium' : 'low'
          });
        }
      });
    });

    return Array.from(challengeStats.values())
      .sort((a, b) => b.avgViolationsPerPerson - a.avgViolationsPerPerson)
      .slice(0, 6); // Top 6 streak breakers
  }, [data]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <X className="h-3 w-3" />;
      case 'medium': return <TrendingDown className="h-3 w-3" />;
      case 'low': return <Zap className="h-3 w-3" />;
      default: return <Zap className="h-3 w-3" />;
    }
  };

  if (streakBreakerData.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-chart-4" />
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
          <Zap className="h-5 w-5 text-chart-4" />
          <CardTitle className="text-lg">{t[lang].title}</CardTitle>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {streakBreakerData.map((challenge, index) => (
            <div 
              key={challenge.id}
              className="p-4 rounded-lg bg-gradient-to-br from-muted/20 to-muted/5 border border-muted/20 hover:border-muted/40 transition-all duration-200 hover-scale"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <div className="flex items-center gap-1">
                    {getSeverityIcon(challenge.severity)}
                    <span className="text-xs text-muted-foreground">❌</span>
                  </div>
                </div>
                <Badge variant={getSeverityColor(challenge.severity)} className="text-xs">
                  {t[lang][challenge.severity as keyof typeof t['en']]}
                </Badge>
              </div>
              
              <h4 className="font-medium text-sm mb-2 line-clamp-2">{challenge.title}</h4>
              
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t[lang].participants}:</span>
                  <span className="font-medium">{challenge.participants}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t[lang].violations}:</span>
                  <span className="font-medium">{challenge.violations}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t[lang].avgViolations}:</span>
                  <span className="font-medium">{challenge.avgViolationsPerPerson.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};