import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface KPICardData {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent: string;
  calc?: {
    title: string;
    text: string;
    formula: string;
  };
}

interface Props {
  card: KPICardData;
}

export default function KPICard({ card }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <card.icon className={`h-4 w-4 ${card.accent}`} />
          <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
          {card.calc && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  <Info size={12} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="top" align="start">
                <p className="font-semibold text-sm mb-1">{card.calc.title}</p>
                <p className="text-xs text-muted-foreground mb-2">{card.calc.text}</p>
                <pre className="text-xs font-mono bg-muted/50 rounded px-2 py-1.5 whitespace-pre-wrap">{card.calc.formula}</pre>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <p className="text-xl font-bold text-foreground">{card.value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
      </CardContent>
    </Card>
  );
}
