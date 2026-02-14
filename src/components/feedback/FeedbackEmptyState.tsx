import { MessageSquarePlus } from 'lucide-react';

interface Props {
  hasEmployee: boolean;
}

export function FeedbackEmptyState({ hasEmployee }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          {hasEmployee ? 'Noch kein Feedback' : 'Mitarbeiter auswählen'}
        </h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          {hasEmployee
            ? 'Erfasse dein erstes Feedback über das Formular oben.'
            : 'Wähle einen Mitarbeiter aus der Liste oder lege einen neuen an.'}
        </p>
      </div>
    </div>
  );
}
