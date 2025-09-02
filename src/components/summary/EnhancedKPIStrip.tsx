import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { format, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInWeeks } from "date-fns";
import { formatEUR } from "@/lib/currency";

interface EnhancedKPIStripProps {
  data: {
    challenges: any[];
    stats: {
      totalChallenges: number;
      uniqueParticipants: number;
      totalPenalties: number;
    };
  };
  dateRange: { start: Date; end: Date };
  lang: 'de' | 'en';
  onKPIClick?: (kpi: string) => void;
}

interface KPIModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: 'performance' | 'engagement' | 'discipline' | 'financial' | null;
  values: {
    performance: number;
    engagement: number; 
    discipline: number;
    financial: number;
  };
  lang: 'de' | 'en';
}

function KPIModal({ isOpen, onClose, metric, values, lang }: KPIModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !metric) return null;

  const t = {
    de: {
      performance: {
        title: "Performance Index",
        definition: "Ein gewichteter Score, der Engagement (20%), Discipline (50%) und Financial Impact (30%) kombiniert. Jede Komponente wird normalisiert (0–1), der finale Index wird auf einer 0–100 Skala angezeigt.",
        example: `Angenommen Engagement = 95% (0.95), Discipline = 0.6 und Financial Impact = 0.7. Dann:

Index = (0.2 × 0.95 + 0.5 × 0.6 + 0.3 × 0.7) × 100 = 77.7

Ihre aktuellen Werte:
• Engagement: ${values.engagement.toFixed(1)}% (${(values.engagement / 100).toFixed(2)})
• Discipline: ${values.discipline.toFixed(2)}
• Financial Impact: ${values.financial.toFixed(2)}
• Performance Index: ${values.performance.toFixed(1)}`
      },
      engagement: {
        title: "Engagement Rate",
        definition: "Der Prozentsatz der Teilnehmer, die mindestens einmal pro Woche während des ausgewählten Zeitraums aktiv waren.",
        example: `Wenn 20 Teilnehmer angemeldet sind und 19 davon mindestens einmal im Zeitraum teilgenommen haben, dann Engagement = (19 ÷ 20) × 100% = 95%.

Ihre aktuelle Engagement Rate: ${values.engagement.toFixed(1)}%`
      },
      discipline: {
        title: "Discipline Score", 
        definition: "Ein normalisierter Score (0–1), der repräsentiert, wie wenige Fails (Verstöße oder KPI-Verfehlungen) pro Teilnehmer auftreten.",
        example: `Berechnung:
avgFailsPerUserPerWeek = total fails ÷ (total participants × weeks)
Discipline = max(0, 1 - avgFailsPerUserPerWeek ÷ failThreshold)

Beispiel: Mit 10 Teilnehmern über 4 Wochen und 12 totalen Fails, avgFails = 12 ÷ (10 × 4) = 0.3. Wenn der Schwellenwert 1 ist, Discipline = 1 – 0.3 = 0.7.

Ihr aktueller Discipline Score: ${values.discipline.toFixed(2)}`
      },
      financial: {
        title: "Financial Impact",
        definition: "Die durchschnittliche Strafe pro Teilnehmer pro Woche (in Euro). Niedrigere Werte zeigen niedrigere Kosten an.",
        example: `Wenn die Gesamtstrafen im Zeitraum €22 sind, es 11 Teilnehmer gibt und der Zeitraum 2 Wochen umfasst, dann:

Financial Impact = 22 ÷ (11 × 2) = €1.00

Ihr aktueller Financial Impact: €${values.financial.toFixed(2)}`
      }
    },
    en: {
      performance: {
        title: "Performance Index",
        definition: "A weighted score that combines Engagement (20%), Discipline (50%) and Financial Impact (30%). Each component is normalized (0–1), and the final index is shown on a 0–100 scale.",
        example: `Suppose Engagement = 95% (0.95), Discipline = 0.6 and Financial Impact = 0.7. Then:

Index = (0.2 × 0.95 + 0.5 × 0.6 + 0.3 × 0.7) × 100 = 77.7

Your current values:
• Engagement: ${values.engagement.toFixed(1)}% (${(values.engagement / 100).toFixed(2)})
• Discipline: ${values.discipline.toFixed(2)}
• Financial Impact: ${values.financial.toFixed(2)}
• Performance Index: ${values.performance.toFixed(1)}`
      },
      engagement: {
        title: "Engagement Rate",
        definition: "The percentage of participants who were active at least once per week during the selected period.",
        example: `If 20 participants are enrolled and 19 of them participated at least once in the period, Engagement = (19 ÷ 20) × 100% = 95%.

Your current engagement rate: ${values.engagement.toFixed(1)}%`
      },
      discipline: {
        title: "Discipline Score",
        definition: "A normalized score (0–1) representing how few fails (violations or KPI misses) occur per participant.",
        example: `Calculation:
avgFailsPerUserPerWeek = total fails ÷ (total participants × weeks)
Discipline = max(0, 1 - avgFailsPerUserPerWeek ÷ failThreshold)

Example: With 10 participants over 4 weeks and 12 total fails, avgFails = 12 ÷ (10 × 4) = 0.3. If the threshold is 1, Discipline = 1 – 0.3 = 0.7.

Your current discipline score: ${values.discipline.toFixed(2)}`
      },
      financial: {
        title: "Financial Impact",
        definition: "The average penalty per participant per week (in euros). Lower values indicate lower costs.",
        example: `If total penalties in the period are €22, there are 11 participants, and the period covers 2 weeks, then:

Financial Impact = 22 ÷ (11 × 2) = €1.00

Your current financial impact: €${values.financial.toFixed(2)}`
      }
    }
  };

  const content = t[lang][metric];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative z-10 max-w-[720px] w-full mx-4 max-h-[80vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{content.title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                {lang === 'de' ? 'Definition' : 'Definition'}
              </h3>
              <p className="text-sm leading-relaxed">
                {content.definition}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                {lang === 'de' ? 'Beispiel & Aktuelle Werte' : 'Example & Current Values'}
              </h3>
              <pre className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap font-mono">
                {content.example}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Ring chart component for Performance Index
function PerformanceRing({ value, size = 180 }: { value: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(339 60% 70%)" /> {/* Pink/Red */}
            <stop offset="100%" stopColor="hsl(220 70% 60%)" /> {/* Blue */}
          </linearGradient>
        </defs>
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#performanceGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight">{value.toFixed(0)}</span>
        <span className="text-sm text-muted-foreground">Index</span>
      </div>
    </div>
  );
}

export function EnhancedKPIStrip({ data, dateRange, lang, onKPIClick }: EnhancedKPIStripProps) {
  const [modalMetric, setModalMetric] = useState<'performance' | 'engagement' | 'discipline' | 'financial' | null>(null);

  const t = {
    de: {
      performance: "Performance Index",
      engagement: "Engagement", 
      discipline: "Discipline",
      financial: "Financial Impact",
      close: "Schließen"
    },
    en: {
      performance: "Performance Index",
      engagement: "Engagement",
      discipline: "Discipline", 
      financial: "Financial Impact",
      close: "Close"
    }
  };

  // Calculate weekly data for metrics
  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval(dateRange, { weekStartsOn: 1 });
    
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      
      // Filter challenges active in this week
      const weekChallenges = data.challenges.filter(challenge => 
        challenge.start_date <= weekEndStr && challenge.end_date >= weekStartStr
      );
      
      // Count unique participants in this week
      const weekParticipants = new Set(
        weekChallenges.flatMap(c => c.participants?.map((p: any) => p.user_id) || [])
      ).size;
      
      // Count participants who were active (had logs or violations)
      const activeParticipants = new Set(
        weekChallenges.flatMap(c => [
          ...(c.logs?.filter((l: any) => l.date >= weekStartStr && l.date <= weekEndStr).map((l: any) => l.user_id) || []),
          ...(c.violations?.filter((v: any) => v.date >= weekStartStr && v.date <= weekEndStr).map((v: any) => v.user_id) || [])
        ])
      ).size;
      
      // Count total fails 
      const weekViolations = weekChallenges.reduce((sum, challenge) => {
        const regularViolations = challenge.violations?.filter((v: any) => 
          v.date >= weekStartStr && v.date <= weekEndStr
        ).length || 0;
        
        const kpiViolations = challenge.kpi_data?.filter((kpi: any) => 
          kpi.date >= weekStartStr && kpi.date <= weekEndStr && !kpi.achieved
        ).length || 0;
        
        return sum + regularViolations + kpiViolations;
      }, 0);
      
      // Sum penalties in EUR
      const weekPenalties = weekChallenges.reduce((sum, challenge) => 
        sum + (challenge.violations?.filter((v: any) => v.date >= weekStartStr && v.date <= weekEndStr)
          .reduce((violSum: number, v: any) => violSum + (v.amount_cents || 0), 0) || 0), 0
      ) / 100; // Convert cents to EUR
      
      return {
        week: format(weekStart, 'yyyy-MM-dd'),
        participants: weekParticipants,
        activeParticipants,
        violations: weekViolations,
        penalties: weekPenalties
      };
    });
  }, [data, dateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalWeeks = weeklyData.length;
    const totalParticipants = new Set(
      data.challenges.flatMap(c => c.participants?.map((p: any) => p.user_id) || [])
    ).size;
    
    if (totalWeeks === 0 || totalParticipants === 0) {
      return {
        engagement: 0,
        discipline: 0,
        financial: 0,
        performance: 0
      };
    }

    // Engagement: avg engaged participants per week / total participants * 100
    const avgEngagedPerWeek = weeklyData.reduce((sum, w) => sum + w.activeParticipants, 0) / totalWeeks;
    const engagement = (avgEngagedPerWeek / totalParticipants) * 100;
    
    // Discipline: 1 - (avg fails per participant per week / threshold)
    const totalFails = weeklyData.reduce((sum, w) => sum + w.violations, 0);
    const avgFailsPerParticipantPerWeek = totalFails / (totalParticipants * totalWeeks);
    const failThreshold = 1;
    const discipline = Math.max(0, 1 - (avgFailsPerParticipantPerWeek / failThreshold));
    
    // Financial Impact: avg penalties per participant per week (EUR)
    const totalPenalties = weeklyData.reduce((sum, w) => sum + w.penalties, 0);
    const financial = totalPenalties / (totalParticipants * totalWeeks);
    
    // Performance Index: weighted combination
    const engagementNorm = engagement / 100;
    const financialThreshold = 10; // €10 per participant per week
    const financialNorm = Math.max(0, 1 - (financial / financialThreshold));
    const performance = (0.2 * engagementNorm + 0.5 * discipline + 0.3 * financialNorm) * 100;
    
    return {
      engagement: Math.min(100, Math.max(0, engagement)),
      discipline: Math.min(1, Math.max(0, discipline)),
      financial: Math.max(0, financial),
      performance: Math.min(100, Math.max(0, performance))
    };
  }, [weeklyData, data.challenges]);

  // Calculate previous period for deltas
  const previousPeriodLength = Math.max(1, differenceInWeeks(dateRange.end, dateRange.start));
  const previousStart = new Date(dateRange.start);
  previousStart.setDate(previousStart.getDate() - (previousPeriodLength * 7));
  const previousEnd = new Date(dateRange.start);
  previousEnd.setDate(previousEnd.getDate() - 1);

  // For now, use dummy previous values - in real implementation, calculate from previous period
  const previousMetrics = {
    engagement: metrics.engagement * 0.9, // 10% lower
    discipline: metrics.discipline * 0.95, // 5% lower  
    financial: metrics.financial * 1.1, // 10% higher
    performance: metrics.performance * 0.92 // 8% lower
  };

  const deltas = {
    engagement: {
      value: Math.abs(metrics.engagement - previousMetrics.engagement),
      isPositive: metrics.engagement > previousMetrics.engagement
    },
    discipline: {
      value: Math.abs((metrics.discipline - previousMetrics.discipline) * 100),
      isPositive: metrics.discipline > previousMetrics.discipline
    },
    financial: {
      value: Math.abs(((metrics.financial - previousMetrics.financial) / Math.max(0.01, previousMetrics.financial)) * 100),
      isPositive: metrics.financial < previousMetrics.financial // Lower is better
    },
    performance: {
      value: Math.abs(metrics.performance - previousMetrics.performance),
      isPositive: metrics.performance > previousMetrics.performance
    }
  };

  const kpis = [
    {
      key: 'performance' as const,
      title: t[lang].performance,
      value: metrics.performance,
      delta: deltas.performance,
      sparklineData: weeklyData.map((w, i) => ({ week: i, value: 75 + Math.sin(i) * 10 })), // Dummy data
      isRing: true
    },
    {
      key: 'engagement' as const,
      title: t[lang].engagement,
      value: metrics.engagement,
      delta: deltas.engagement,
      sparklineData: weeklyData.map((w, i) => ({ week: i, value: w.activeParticipants / Math.max(1, w.participants) * 100 })),
      suffix: '%'
    },
    {
      key: 'discipline' as const,
      title: t[lang].discipline,
      value: metrics.discipline,
      delta: deltas.discipline,
      sparklineData: weeklyData.map((w, i) => ({ week: i, value: Math.max(0, 1 - (w.violations / Math.max(1, w.participants))) })),
      precision: 2
    },
    {
      key: 'financial' as const,
      title: t[lang].financial,
      value: metrics.financial,
      delta: deltas.financial,
      sparklineData: weeklyData.map((w, i) => ({ week: i, value: w.penalties / Math.max(1, w.participants) })),
      prefix: '€',
      precision: 2
    }
  ];

  return (
    <>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const DeltaIcon = kpi.delta.isPositive ? TrendingUp : TrendingDown;
          const deltaColorClass = kpi.delta.isPositive 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-red-600 dark:text-red-400';
          const deltaBackgroundClass = kpi.delta.isPositive
            ? 'bg-emerald-50 dark:bg-emerald-950/30'
            : 'bg-red-50 dark:bg-red-950/30';

          return (
            <Card key={kpi.key} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                {/* Header with title and info button */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {kpi.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => setModalMetric(kpi.key)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>

                {/* Value display */}
                <div className="flex flex-col items-center justify-center mb-4">
                  {kpi.isRing ? (
                    <PerformanceRing value={kpi.value} size={160} />
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl font-bold tracking-tight">
                        {kpi.prefix || ''}{kpi.value.toFixed(kpi.precision || 0)}{kpi.suffix || ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* Delta badge */}
                {!kpi.isRing && (
                  <div className="flex justify-center mb-4">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${deltaBackgroundClass}`}>
                      <DeltaIcon className={`h-3 w-3 ${deltaColorClass}`} />
                      <span className={`text-xs font-semibold ${deltaColorClass}`}>
                        {kpi.delta.isPositive ? '+' : ''}{kpi.delta.value.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Performance ring delta below the ring */}
                {kpi.isRing && (
                  <div className="flex justify-center mt-2">
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${deltaBackgroundClass}`}>
                      <DeltaIcon className={`h-3 w-3 ${deltaColorClass}`} />
                      <span className={`text-xs font-semibold ${deltaColorClass}`}>
                        {kpi.delta.isPositive ? '+' : ''}{kpi.delta.value.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Sparkline */}
                <div className="h-12 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpi.sparklineData}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, stroke: 'hsl(var(--primary))', strokeWidth: 2, fill: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      <KPIModal
        isOpen={modalMetric !== null}
        onClose={() => setModalMetric(null)}
        metric={modalMetric}
        values={metrics}
        lang={lang}
      />
    </>
  );
}