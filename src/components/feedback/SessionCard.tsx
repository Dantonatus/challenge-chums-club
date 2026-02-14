import { FeedbackEntry, FeedbackSession } from '@/lib/feedback/types';
import { FeedbackEntryCard } from './FeedbackEntryCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  session: FeedbackSession;
  entries: FeedbackEntry[];
  onDelete: (id: string) => void;
}

export function SessionCard({ session, entries, onDelete }: Props) {
  const dateStr = (() => {
    try {
      const [y, m, d] = session.session_date.split('-').map(Number);
      return format(new Date(y, m - 1, d), 'd. MMMM yyyy', { locale: de });
    } catch {
      return session.session_date;
    }
  })();

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={session.id} className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-3 text-left flex-1">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">{dateStr}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'})
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {session.notes && (
            <div className="mb-3 flex items-start gap-2 rounded-md bg-muted/50 p-3">
              <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}
          <div className="space-y-2">
            {entries.map(entry => (
              <FeedbackEntryCard
                key={entry.id}
                entry={entry}
                onToggleShared={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
                readOnly
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
