import { useState, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pin, PinOff, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { LearningNugget } from "@/hooks/useLearningNuggets";
import { LearningTopic } from "@/hooks/useLearningTopics";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

// --- formatOriginalText helper ---

function formatOriginalText(text: string): ReactNode[] {
  const paragraphs = text.split(/\n\s*\n/);
  const elements: ReactNode[] = [];

  paragraphs.forEach((para, pi) => {
    const lines = para.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) return;

    // Check if all lines are list items
    const isListBlock = lines.every((l) =>
      /^\s*[-*•›>]\s/.test(l) || /^\s*\d+[.)]\s/.test(l)
    );

    if (isListBlock) {
      elements.push(
        <ul key={`p${pi}`} className="space-y-1 pl-4 my-1.5">
          {lines.map((l, li) => (
            <li key={li} className="list-disc text-foreground/80">
              {l.replace(/^\s*[-*•›>]\s*/, "").replace(/^\s*\d+[.)]\s*/, "")}
            </li>
          ))}
        </ul>
      );
      return;
    }

    // Process lines individually
    lines.forEach((line, li) => {
      const trimmed = line.trim();

      // Heading-like: short line ending with colon, or starts with emoji
      if (
        (trimmed.length < 80 && trimmed.endsWith(":")) ||
        (trimmed.length < 80 && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(trimmed))
      ) {
        elements.push(
          <p key={`p${pi}-${li}`} className="font-semibold text-foreground mt-2 first:mt-0">
            {trimmed}
          </p>
        );
      } else if (/^\s*[-*•›>]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
        // Single list item in mixed paragraph
        elements.push(
          <ul key={`p${pi}-${li}`} className="pl-4 my-0.5">
            <li className="list-disc text-foreground/80">
              {trimmed.replace(/^[-*•›>]\s*/, "").replace(/^\d+[.)]\s*/, "")}
            </li>
          </ul>
        );
      } else {
        elements.push(
          <p key={`p${pi}-${li}`} className="text-foreground/80 my-1">
            {trimmed}
          </p>
        );
      }
    });
  });

  return elements;
}

// --- NuggetCard ---

interface NuggetCardProps {
  nugget: LearningNugget;
  topic?: LearningTopic;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}

export function NuggetCard({ nugget, topic, onTogglePin, onDelete }: NuggetCardProps) {
  const [originalOpen, setOriginalOpen] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(nugget.created_at), { addSuffix: true, locale: de });

  return (
    <Card className={`transition-all ${nugget.is_pinned ? "border-primary/40 shadow-sm" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">{nugget.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {topic && (
                <Badge
                  variant="outline"
                  style={{ borderColor: topic.color, color: topic.color }}
                  className="text-[10px] px-1.5 py-0"
                >
                  {topic.emoji ? `${topic.emoji} ` : ""}{topic.name}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onTogglePin(nugget.id, !nugget.is_pinned)}
            >
              {nugget.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/60 hover:text-destructive"
              onClick={() => onDelete(nugget.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Summary - prominent */}
        {nugget.summary && (
          <div className="bg-primary/5 rounded-md p-3">
            <p className="text-sm leading-relaxed">{nugget.summary}</p>
          </div>
        )}

        {/* Key Points - open by default */}
        {nugget.key_points.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Kernpunkte ({nugget.key_points.length})
            </p>
            <ul className="space-y-1 pl-4">
              {nugget.key_points.map((kp, i) => (
                <li key={i} className="text-sm list-disc text-foreground/80">{kp}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        {nugget.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nugget.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Original text collapsible - formatted */}
        {nugget.content && (
          <Collapsible open={originalOpen} onOpenChange={setOriginalOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              {originalOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Originaltext
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 rounded-md p-4 text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                {formatOriginalText(nugget.content)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
