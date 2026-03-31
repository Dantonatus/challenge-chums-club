import { useState, useMemo } from 'react';
import { DreamEntry, MOODS } from '@/lib/dreams/types';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  entries: DreamEntry[];
  onSelect: (d: DreamEntry) => void;
}

export function DreamAllView({ entries, onSelect }: Props) {
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) =>
      sortDir === 'desc'
        ? b.entry_date.localeCompare(a.entry_date)
        : a.entry_date.localeCompare(b.entry_date)
    );
  }, [entries, sortDir]);

  const moodEmoji = (value: string | null) => {
    if (!value) return '—';
    return MOODS.find(m => m.value === value)?.emoji ?? value;
  };

  const vividDots = (n: number | null) => {
    if (n == null) return '—';
    return '●'.repeat(n) + '○'.repeat(5 - n);
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">📋</p>
        <p className="font-serif text-lg">Noch keine Einträge</p>
      </div>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-card/60 border-border/50">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))}
              >
                <span className="inline-flex items-center gap-1">
                  Datum <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              </TableHead>
              <TableHead>Titel</TableHead>
              <TableHead className="text-center w-16">Mood</TableHead>
              <TableHead className="hidden md:table-cell text-center">Lebendigkeit</TableHead>
              <TableHead className="text-center w-16">Luzid</TableHead>
              <TableHead className="hidden lg:table-cell">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(d => (
              <TableRow
                key={d.id}
                className="cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => onSelect(d)}
              >
                <TableCell className="font-medium text-sm whitespace-nowrap">
                  {format(parseISO(d.entry_date), 'd. MMM yy', { locale: de })}
                </TableCell>
                <TableCell className="font-serif">{d.title}</TableCell>
                <TableCell className="text-center text-lg">{moodEmoji(d.mood)}</TableCell>
                <TableCell className="hidden md:table-cell text-center text-xs tracking-wider text-muted-foreground">
                  {vividDots(d.vividness)}
                </TableCell>
                <TableCell className="text-center">
                  {d.is_lucid && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Luzid
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {d.tags?.slice(0, 3).map(t => (
                      <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                        {t}
                      </Badge>
                    ))}
                    {(d.tags?.length ?? 0) > 3 && (
                      <span className="text-xs text-muted-foreground">+{d.tags!.length - 3}</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
