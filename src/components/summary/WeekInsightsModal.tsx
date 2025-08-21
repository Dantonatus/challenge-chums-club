import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatEUR } from "@/lib/currency";
import { ExternalLink, TrendingDown, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WeekInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekData: {
    challengeId: string;
    challengeTitle: string;
    challengeType: 'habit' | 'kpi';
    weekNumber: number;
    participants: Array<{
      user_id: string;
      display_name: string;
      habitViolations: number;
      kpiDeviations: number;
      totalPenalty: number;
      status: 'success' | 'warning' | 'danger' | 'inactive';
      custom_color?: string;
    }>;
    weeklyTotalPenalty: number;
  } | null;
  lang: 'de' | 'en';
}

export const WeekInsightsModal = ({ isOpen, onClose, weekData, lang }: WeekInsightsModalProps) => {
  const navigate = useNavigate();

  const t = {
    de: {
      weekInsights: "Wochen-Einblicke",
      week: "KW",
      challenge: "Challenge",
      participants: "Teilnehmer",
      totalPenalty: "Gesamtstrafe",
      habitViolations: "Habit-Verstöße",
      kpiDeviations: "KPI-Abweichungen",
      successRate: "Erfolgsquote",
      viewChallenge: "Challenge ansehen",
      performance: "Leistung",
      excellent: "Ausgezeichnet",
      good: "Gut", 
      needsImprovement: "Verbesserungsbedürftig",
      critical: "Kritisch",
      noViolations: "Keine Verstöße",
      summary: "Zusammenfassung",
      detailedBreakdown: "Detaillierte Aufschlüsselung",
      averagePenalty: "Durchschnittsstrafe",
      noParticipants: "Keine Teilnehmer"
    },
    en: {
      weekInsights: "Week Insights",
      week: "Week",
      challenge: "Challenge",
      participants: "Participants",
      totalPenalty: "Total Penalty",
      habitViolations: "Habit Violations",
      kpiDeviations: "KPI Deviations", 
      successRate: "Success Rate",
      viewChallenge: "View Challenge",
      performance: "Performance",
      excellent: "Excellent",
      good: "Good",
      needsImprovement: "Needs Improvement", 
      critical: "Critical",
      noViolations: "No violations",
      summary: "Summary",
      detailedBreakdown: "Detailed Breakdown",
      averagePenalty: "Average Penalty",
      noParticipants: "No participants"
    }
  };

  if (!weekData) return null;

  const totalViolations = weekData.participants.reduce((sum, p) => sum + p.habitViolations + p.kpiDeviations, 0);
  const successfulParticipants = weekData.participants.filter(p => p.status === 'success').length;
  const successRate = weekData.participants.length > 0 ? (successfulParticipants / weekData.participants.length) * 100 : 0;
  const averagePenalty = weekData.participants.length > 0 ? weekData.weeklyTotalPenalty / weekData.participants.length : 0;

  const getPerformanceColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-primary';
      case 'warning': return 'text-orange-600';
      case 'danger': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getPerformanceIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'danger': return <TrendingDown className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPerformanceLabel = (status: string) => {
    switch (status) {
      case 'success': return t[lang].excellent;
      case 'warning': return t[lang].needsImprovement;
      case 'danger': return t[lang].critical;
      default: return t[lang].good;
    }
  };

  const handleViewChallenge = () => {
    navigate(`/app/challenges/${weekData.challengeId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t[lang].weekInsights} - {t[lang].week} {weekData.weekNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Challenge Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                {weekData.challengeTitle}
                <Badge variant={weekData.challengeType === 'kpi' ? 'secondary' : 'default'}>
                  {weekData.challengeType.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{weekData.participants.length}</div>
                  <div className="text-sm text-muted-foreground">{t[lang].participants}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{totalViolations}</div>
                  <div className="text-sm text-muted-foreground">{t[lang].habitViolations}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(successRate)}%</div>
                  <div className="text-sm text-muted-foreground">{t[lang].successRate}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatEUR(weekData.weeklyTotalPenalty)}</div>
                  <div className="text-sm text-muted-foreground">{t[lang].totalPenalty}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t[lang].performance}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t[lang].successRate}</span>
                  <span className="text-sm text-muted-foreground">{successfulParticipants}/{weekData.participants.length}</span>
                </div>
                <Progress value={successRate} className="h-2" />
                <div className="flex items-center gap-2 text-sm">
                  {successRate >= 80 && (
                    <>
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-primary">{t[lang].excellent}</span>
                    </>
                  )}
                  {successRate >= 60 && successRate < 80 && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-orange-600">{t[lang].good}</span>
                    </>
                  )}
                  {successRate < 60 && (
                    <>
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">{t[lang].needsImprovement}</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participant Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t[lang].detailedBreakdown}</CardTitle>
            </CardHeader>
            <CardContent>
              {weekData.participants.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {t[lang].noParticipants}
                </div>
              ) : (
                <div className="space-y-3">
                  {weekData.participants.map((participant) => (
                    <div 
                      key={participant.user_id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {participant.custom_color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: participant.custom_color }}
                          />
                        )}
                        <div>
                          <div className="font-medium">{participant.display_name}</div>
                          <div className={`text-sm flex items-center gap-1 ${getPerformanceColor(participant.status)}`}>
                            {getPerformanceIcon(participant.status)}
                            {getPerformanceLabel(participant.status)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {participant.habitViolations > 0 && (
                          <div className="text-sm text-destructive">
                            {participant.habitViolations} {t[lang].habitViolations}
                          </div>
                        )}
                        {participant.kpiDeviations > 0 && (
                          <div className="text-sm text-orange-600">
                            {participant.kpiDeviations} {t[lang].kpiDeviations}
                          </div>
                        )}
                        {participant.totalPenalty > 0 ? (
                          <div className="font-medium">{formatEUR(participant.totalPenalty)}</div>
                        ) : (
                          <div className="text-sm text-primary">{t[lang].noViolations}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {weekData.participants.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t[lang].summary}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t[lang].averagePenalty}:</span>
                    <span className="font-medium">{formatEUR(averagePenalty)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t[lang].totalPenalty}:</span>
                    <span className="font-medium">{formatEUR(weekData.weeklyTotalPenalty)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleViewChallenge} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {t[lang].viewChallenge}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};