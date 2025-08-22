import { useMemo, useState, useCallback } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatEUR } from "@/lib/currency";
import { TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface BestROIChallengesProps {
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

export const BestROIChallenges = ({ data, lang }: BestROIChallengesProps) => {
  const t = {
    de: {
      title: "Beste ROI Challenges",
      description: "Fail-Rate vs. Strafauswirkung (Bubble-Größe = Geldmenge)",
      failRate: "Fail-Rate (%)",
      penaltyImpact: "Strafauswirkung (€)",
      participants: "Teilnehmer",
      violations: "Verstöße",
      totalPenalties: "Gesamtstrafen",
      noData: "Keine Challenges für den gewählten Zeitraum"
    },
    en: {
      title: "Best ROI Challenges", 
      description: "Fail-Rate vs. Penalty Impact (Bubble size = Money amount)",
      failRate: "Fail Rate (%)",
      penaltyImpact: "Penalty Impact (€)",
      participants: "Participants",
      violations: "Violations",
      totalPenalties: "Total Penalties",
      noData: "No challenges for the selected period"
    }
  };

  const navigate = useNavigate();
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(['habit', 'kpi']));

  const toggleType = useCallback((type: 'habit' | 'kpi') => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }, []);

  const bubbleData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const challengeStats: any[] = [];

    data.forEach(item => {
      item.challenges?.forEach(challenge => {
        const participantCount = challenge.participants?.length || 0;
        const violationCount = challenge.violationCount || 0;
        const totalPenalties = (challenge.totalViolationAmount || 0) / 100; // EUR
        
        if (participantCount > 0) {
          const failRate = Math.round((violationCount / participantCount) * 100);
          const penaltyImpact = totalPenalties; // keep existing logic
          
          challengeStats.push({
            id: challenge.id,
            name: challenge.title.length > 20 ? challenge.title.substring(0, 20) + '...' : challenge.title,
            fullName: challenge.title,
            x: failRate,
            y: penaltyImpact,
            totalPenalties, // EUR
            participants: participantCount,
            violations: violationCount,
            type: challenge.challenge_type as 'habit' | 'kpi'
          });
        }
      });
    });

    return challengeStats.sort((a, b) => b.totalPenalties - a.totalPenalties);
  }, [data]);

  // Area-based bubble sizing (r = k * sqrt(amount))
  const rOf = useMemo(() => {
    if (!bubbleData.length) return (a: number) => 8;
    const amounts = bubbleData.map(d => d.totalPenalties);
    const maxA = Math.max(0, ...amounts);
    const rMin = 6;
    const rMax = 28;
    const k = maxA > 0 ? (rMax / Math.sqrt(maxA)) : 0;
    return (a: number) => (a > 0 ? Math.max(rMin, k * Math.sqrt(a)) : rMin);
  }, [bubbleData]);

  // Pastel color by type
  const pastel = (type: 'habit' | 'kpi') => (type === 'habit' ? '#7dd3fc' : '#a7f3d0');

  // Filter by legend selection
  const filteredData = useMemo(() => bubbleData.filter(d => visibleTypes.has(d.type)), [bubbleData, visibleTypes]);

  // Custom node to ensure radius is used by Recharts
  const CustomNode = ({ cx, cy, payload }: any) => {
    const r = rOf(payload.totalPenalties);
    const color = pastel(payload.type);
    return (
      <g
        tabIndex={0}
        role="button"
        aria-label={`${payload.fullName}, ${payload.x}% fails, €${payload.y} impact, €${payload.totalPenalties} total`}
        className="cursor-pointer focus:outline-none"
        onClick={() => navigate(`/challenges/${payload.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/challenges/${payload.id}`);
          }
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={color}
          fillOpacity={0.85}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={1}
          className="transition-all duration-200 hover:drop-shadow-lg motion-reduce:transition-none"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}
        />
      </g>
    );
  };
  if (bubbleData.length === 0) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-chart-5" />
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
    <Card className="h-[480px] md:h-[560px] w-full flex flex-col animate-fade-in bg-gradient-to-br from-background/80 via-background to-background/60 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-300">
      <CardHeader className="shrink-0 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-chart-5" />
          <CardTitle className="text-lg">{t[lang].title}</CardTitle>
        </div>
        <CardDescription>{t[lang].description}</CardDescription>
        <div className="mt-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleType('habit')}
            className={`h-auto px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              visibleTypes.has('habit')
                ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-700 border border-cyan-200 shadow-sm dark:from-cyan-950/30 dark:to-sky-950/30 dark:text-cyan-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#7dd3fc' }} />
            Habit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleType('kpi')}
            className={`h-auto px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              visibleTypes.has('kpi')
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm dark:from-emerald-950/30 dark:to-green-950/30 dark:text-emerald-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#a7f3d0' }} />
            KPI
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 md:p-4">
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                type="number" 
                dataKey="x"
                name={t[lang].failRate}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: t[lang].failRate, 
                  position: 'insideBottom', 
                  offset: -10,
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <YAxis 
                type="number" 
                dataKey="y"
                name={t[lang].penaltyImpact}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `€${value}`}
                label={{ 
                  value: t[lang].penaltyImpact, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg animate-scale-in">
                      <p className="font-medium text-foreground mb-2">{data.fullName}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-chart-1" />
                          <span>{t[lang].failRate}: <strong>{data.x}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">💶</span>
                          <span>{t[lang].penaltyImpact}: <strong>{formatEUR(data.y * 100)}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">👥</span>
                          <span>{t[lang].participants}: <strong>{data.participants}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">⚠️</span>
                          <span>{t[lang].violations}: <strong>{data.violations}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter 
                data={filteredData}
                shape={<CustomNode />}
              />
            </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};