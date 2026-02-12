import { GanttTask } from '@/lib/planning/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface GanttPhaseDescriptionsProps {
  tasks: GanttTask[];
  clientColor: string;
}

function isHtml(text: string) {
  return /<[a-z][\s\S]*>/i.test(text);
}

function parseDescription(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const bullets: string[] = [];
  const paragraphs: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-–•*]\s/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-–•*]\s+/, ''));
    } else {
      paragraphs.push(trimmed);
    }
  }

  return { paragraphs, bullets };
}

export function GanttPhaseDescriptions({ tasks, clientColor }: GanttPhaseDescriptionsProps) {
  const withDesc = tasks.filter(t => t.description?.trim());
  if (withDesc.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      <h3 className="text-sm font-semibold text-foreground">Phasenbeschreibungen</h3>
      <div className="grid gap-3">
        {withDesc.map(task => {
          const color = task.color || clientColor;
          const { paragraphs, bullets } = parseDescription(task.description!);

          return (
            <div
              key={task.id}
              className="rounded-lg border border-border bg-card overflow-hidden flex"
            >
              <div className="w-1.5 shrink-0" style={{ backgroundColor: color }} />
              <div className="p-4 flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h4 className="text-sm font-semibold text-foreground">{task.title}</h4>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(task.start_date), 'dd.MM.yyyy', { locale: de })} – {format(new Date(task.end_date), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>
                {isHtml(task.description!) ? (
                  <div
                    className="text-xs text-muted-foreground prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                    dangerouslySetInnerHTML={{ __html: task.description! }}
                  />
                ) : (
                  <>
                    {paragraphs.map((p, i) => (
                      <p key={i} className="text-xs text-muted-foreground mb-1">{p}</p>
                    ))}
                    {bullets.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 mt-1">
                        {bullets.map((b, i) => (
                          <li key={i} className="text-xs text-muted-foreground">{b}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
