import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/currency";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingDown, TrendingUp, Users, Calendar, Euro } from "lucide-react";
import { motion } from "framer-motion";

interface DrilldownData {
  challengeId: string;
  challengeTitle: string;
  challengeType: 'habit' | 'kpi';
  weekNumber: number;
  weekLabel: string;
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
  events: Array<{
    type: 'violation' | 'kpi_miss';
    timestamp: string;
    user_id: string;
    display_name: string;
    amount_cents?: number;
    description: string;
  }>;
}

interface WeekDrilldownModalProps {
  data: DrilldownData;
  isOpen: boolean;
  onClose: () => void;
  lang: 'de' | 'en';
}

export const WeekDrilldownModal = ({ data, isOpen, onClose, lang }: WeekDrilldownModalProps) => {
  const locale = lang === 'de' ? de : enUS;

  const t = {
    de: {
      title: "Wochen-Details",
      challenge: "Challenge",
      week: "Woche",
      participants: "Teilnehmer",
      events: "Ereignisse",
      penalties: "Strafen",
      total: "Gesamt",
      noEvents: "Keine Ereignisse in dieser Woche",
      habitViolation: "Habit-Verstoß",
      kpiMiss: "KPI-Verfehlung",
      viewChallenge: "Challenge ansehen",
      successful: "Erfolgreich",
      timestamp: "Zeitpunkt",
      amount: "Betrag",
      description: "Beschreibung",
      summary: "Zusammenfassung",
      totalFailures: "Gesamtversagen",
      participantCount: "Teilnehmeranzahl"
    },
    en: {
      title: "Week Details",
      challenge: "Challenge",
      week: "Week",
      participants: "Participants",
      events: "Events",
      penalties: "Penalties",
      total: "Total",
      noEvents: "No events this week",
      habitViolation: "Habit Violation",
      kpiMiss: "KPI Miss",
      viewChallenge: "View Challenge",
      successful: "Successful",
      timestamp: "Timestamp",
      amount: "Amount",
      description: "Description",
      summary: "Summary",
      totalFailures: "Total Failures",
      participantCount: "Participant Count"
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case 'danger':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'violation':
        return '🎯';
      case 'kpi_miss':
        return '📊';
      default:
        return '⚠️';
    }
  };

  const totalFailures = data.participants.reduce((sum, p) => sum + p.habitViolations + p.kpiDeviations, 0);
  const successfulParticipants = data.participants.filter(p => p.status === 'success').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm">
              {data.challengeType === 'habit' ? '🎯' : '📊'}
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold">{data.challengeTitle}</div>
              <div className="text-sm text-muted-foreground font-normal">
                {data.weekLabel} • {t[lang].week} {data.weekNumber}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {data.challengeType.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold">{data.participants.length}</div>
                  <div className="text-xs text-muted-foreground">{t[lang].participants}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-red-50 dark:bg-red-900/20">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalFailures}</div>
                  <div className="text-xs text-muted-foreground">{t[lang].totalFailures}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                    <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{successfulParticipants}</div>
                  <div className="text-xs text-muted-foreground">{t[lang].successful}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-amber-50 dark:bg-amber-900/20">
                    <Euro className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatEUR(data.weeklyTotalPenalty)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t[lang].total}</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Participants Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t[lang].participants}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.participants.map((participant, index) => (
                    <motion.div
                      key={participant.user_id}
                      className={`p-4 rounded-lg border ${getStatusColor(participant.status)}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + (index * 0.1) }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: participant.custom_color || '#6b7280' }}
                        />
                        <div className="font-medium truncate">{participant.display_name}</div>
                        <Badge 
                          variant={participant.status === 'success' ? 'default' : 'destructive'}
                          className="text-xs ml-auto"
                        >
                          {participant.status === 'success' ? '✓' : '⚠️'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        {participant.habitViolations > 0 && (
                          <div className="flex justify-between">
                            <span>🎯 {t[lang].habitViolation}:</span>
                            <span className="font-medium">{participant.habitViolations}</span>
                          </div>
                        )}
                        {participant.kpiDeviations > 0 && (
                          <div className="flex justify-between">
                            <span>📊 {t[lang].kpiMiss}:</span>
                            <span className="font-medium">{participant.kpiDeviations}</span>
                          </div>
                        )}
                        {participant.totalPenalty > 0 && (
                          <div className="flex justify-between font-medium">
                            <span>💶 {t[lang].penalties}:</span>
                            <span>{formatEUR(participant.totalPenalty)}</span>
                          </div>
                        )}
                        {participant.habitViolations === 0 && participant.kpiDeviations === 0 && (
                          <div className="text-center font-medium">
                            ✓ {t[lang].successful}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Events Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {t[lang].events} ({data.events.length})
                </h3>
                
                {data.events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center text-2xl">
                      🎉
                    </div>
                    <p>{t[lang].noEvents}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.events.map((event, index) => (
                      <motion.div
                        key={index}
                        className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg border border-border/50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.6 + (index * 0.05) }}
                      >
                        <div className="text-2xl flex-shrink-0 mt-1">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{event.display_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {event.type === 'violation' ? t[lang].habitViolation : t[lang].kpiMiss}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {event.description}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              🕒 {format(new Date(event.timestamp), 'PPp', { locale })}
                            </span>
                            {event.amount_cents && (
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                💶 {formatEUR(event.amount_cents)}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Navigate to challenge detail
              window.location.href = `/challenge/${data.challengeId}`;
            }}
            className="flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            {t[lang].viewChallenge}
          </Button>
          
          <Button onClick={onClose} variant="default">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};