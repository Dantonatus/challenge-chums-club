import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pin, PinOff, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { LearningNugget } from "@/hooks/useLearningNuggets";
import { LearningTopic } from "@/hooks/useLearningTopics";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface NuggetCardProps {
  nugget: LearningNugget;
  topic?: LearningTopic;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}

export function NuggetCard({ nugget, topic, onTogglePin, onDelete }: NuggetCardProps) {
  const [keyPointsOpen, setKeyPointsOpen] = useState(false);
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

        {/* Summary */}
        {nugget.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed">{nugget.summary}</p>
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

        {/* Key Points collapsible */}
        {nugget.key_points.length > 0 && (
          <Collapsible open={keyPointsOpen} onOpenChange={setKeyPointsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              {keyPointsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Kernpunkte ({nugget.key_points.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ul className="space-y-1 pl-4">
                {nugget.key_points.map((kp, i) => (
                  <li key={i} className="text-sm list-disc text-foreground/80">{kp}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Original text collapsible */}
        {nugget.content && (
          <Collapsible open={originalOpen} onOpenChange={setOriginalOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              {originalOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Originaltext
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 rounded-md p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto">
                {nugget.content}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
