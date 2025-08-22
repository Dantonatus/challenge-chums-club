import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Calendar } from "lucide-react";

interface TooltipData {
  week: string;
  participants: Array<{
    name: string;
    fails: number;
    penalties: number;
    color: string;
    challenges?: string[];
  }>;
}

interface EnhancedTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  lang: 'de' | 'en';
}

export function EnhancedTooltip({ active, payload, label, lang }: EnhancedTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const t = {
    de: {
      fails: 'Fails',
      penalties: 'Strafen',
      euro: '€',
      challenges: 'Challenges',
      total: 'Gesamt'
    },
    en: {
      fails: 'Fails',
      penalties: 'Penalties',
      euro: '€',
      challenges: 'Challenges',
      total: 'Total'
    }
  };

  // Calculate totals
  const totalFails = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const totalPenalties = payload.reduce((sum, entry) => sum + ((entry.payload?.penalties || 0)), 0);

  return (
    <Card className="p-4 shadow-xl border-2 border-border/50 bg-background/95 backdrop-blur-sm max-w-xs">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">{label}</span>
      </div>

      {/* Participants */}
      <div className="space-y-2">
        {payload.map((entry, index) => {
          if (entry.value === 0) return null;
          
          const penalties = entry.payload?.penalties || 0;
          
          return (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {entry.dataKey}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: entry.color, color: entry.color }}
                >
                  {entry.value} {t[lang].fails}
                </Badge>
                
                {penalties > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-xs"
                  >
                    {(penalties / 100).toFixed(2)}{t[lang].euro}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {(totalFails > 0 || totalPenalties > 0) && (
        <>
          <div className="border-t border-border/50 mt-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t[lang].total}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {totalFails} {t[lang].fails}
                </Badge>
                
                {totalPenalties > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {(totalPenalties / 100).toFixed(2)}{t[lang].euro}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Warning for high fails */}
          {totalFails >= 5 && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-milestone-warning/10 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-milestone-warning" />
              <span className="text-xs text-milestone-warning font-medium">
                {lang === 'de' ? 'Hohe Fail-Rate!' : 'High fail rate!'}
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}