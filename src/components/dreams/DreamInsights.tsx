import { DreamEntry, MOODS, EMOTIONS } from '@/lib/dreams/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid } from 'recharts';
import { useMemo } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Sparkles, Flame, Moon, Star } from 'lucide-react';

interface Props {
  entries: DreamEntry[];
}

export function DreamInsights({ entries }: Props) {
  // KPIs
  const totalDreams = entries.length;
  const lucidCount = entries.filter(e => e.is_lucid).length;
  const lucidRate = totalDreams > 0 ? Math.round((lucidCount / totalDreams) * 100) : 0;
  const avgVividness = totalDreams > 0 ? (entries.reduce((s, e) => s + (e.vividness ?? 0), 0) / totalDreams).toFixed(1) : '—';
  const avgSleep = totalDreams > 0 ? (entries.reduce((s, e) => s + (e.sleep_quality ?? 0), 0) / totalDreams).toFixed(1) : '—';

  // Streak
  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const sorted = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    const dates = [...new Set(sorted.map(e => e.entry_date))];
    let count = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      if (differenceInCalendarDays(parseISO(dates[i]), parseISO(dates[i + 1])) === 1) {
        count++;
      } else break;
    }
    return count;
  }, [entries]);

  // Tag cloud
  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => e.tags?.forEach(t => { map[t] = (map[t] ?? 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [entries]);

  // Emotion distribution
  const emotionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => e.emotions?.forEach(em => { map[em] = (map[em] ?? 0) + 1; }));
    return EMOTIONS.map(e => ({ ...e, count: map[e.value] ?? 0 })).filter(e => e.count > 0).sort((a, b) => b.count - a.count);
  }, [entries]);

  // Scatter data (sleep quality vs vividness)
  const scatterData = useMemo(() => {
    return entries
      .filter(e => e.sleep_quality && e.vividness)
      .map(e => ({ sleepQuality: e.sleep_quality, vividness: e.vividness }));
  }, [entries]);

  // Vividness trend (last 20)
  const vividTrend = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      .slice(-20)
      .map(e => ({
        date: format(parseISO(e.entry_date), 'd. MMM', { locale: de }),
        vividness: e.vividness ?? 0,
        sleep: e.sleep_quality ?? 0,
      }));
  }, [entries]);

  if (totalDreams === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">📊</p>
        <p className="font-serif text-lg">Noch keine Daten für Insights</p>
        <p className="text-sm mt-1">Erfasse mindestens ein paar Träume</p>
      </div>
    );
  }

  const maxTag = tagCounts[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Träume', value: totalDreams, icon: Moon },
          { label: 'Luzid', value: `${lucidCount} (${lucidRate}%)`, icon: Sparkles },
          { label: 'Ø Vivid', value: avgVividness, icon: Star },
          { label: 'Ø Schlaf', value: `${avgSleep} ★`, icon: Star },
          { label: 'Streak', value: `${streak}d`, icon: Flame },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-card/60 backdrop-blur-sm border-border/40">
              <CardContent className="p-3 text-center">
                <kpi.icon className="w-4 h-4 mx-auto text-primary mb-1" />
                <div className="text-lg font-bold">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vividness + Sleep trend */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vivid & Schlaf Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={vividTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="vividness" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Lebendigkeit" />
                <Area type="monotone" dataKey="sleep" stroke="hsl(45, 93%, 58%)" fill="hsl(45, 93%, 58%)" fillOpacity={0.1} name="Schlaf" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Scatter: Sleep vs Vividness */}
        {scatterData.length >= 3 && (
          <Card className="bg-card/60 backdrop-blur-sm border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Schlaf vs. Lebendigkeit</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" dataKey="sleepQuality" domain={[0, 5]} name="Schlaf" tick={{ fontSize: 10 }} />
                  <YAxis type="number" dataKey="vividness" domain={[0, 5]} name="Vivid" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tag Cloud + Emotions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tag Cloud */}
        {tagCounts.length > 0 && (
          <Card className="bg-card/60 backdrop-blur-sm border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Themen-Cloud</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 justify-center py-2">
                {tagCounts.map(([tag, count]) => {
                  const scale = 0.7 + (count / maxTag) * 0.8;
                  return (
                    <motion.span
                      key={tag}
                      whileHover={{ scale: scale + 0.15 }}
                      className="px-2.5 py-1 rounded-full bg-primary/15 text-primary cursor-default transition-shadow hover:shadow-lg hover:shadow-primary/20"
                      style={{ fontSize: `${Math.max(11, 11 + (count / maxTag) * 10)}px` }}
                    >
                      {tag} <span className="opacity-50 text-[10px]">{count}</span>
                    </motion.span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emotions bar */}
        {emotionCounts.length > 0 && (
          <Card className="bg-card/60 backdrop-blur-sm border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Emotionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {emotionCounts.map((e) => (
                <div key={e.value} className="flex items-center gap-2">
                  <span className="text-xs w-20 text-right text-muted-foreground">{e.label}</span>
                  <div className="flex-1 h-3 bg-muted/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(e.count / (emotionCounts[0]?.count || 1)) * 100}%` }}
                      className={`h-full rounded-full ${e.color.split(' ')[0]}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-6">{e.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
