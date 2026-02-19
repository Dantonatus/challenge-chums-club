import { LearningTopic } from "@/hooks/useLearningTopics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicSidebarProps {
  topics: LearningTopic[];
  selectedTopicId: string | null;
  onSelect: (topicId: string | null) => void;
  onCreateTopic: () => void;
  onDeleteTopic?: (id: string) => void;
  nuggetCounts: Record<string, number>;
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
}

export function TopicSidebar({
  topics,
  selectedTopicId,
  onSelect,
  onCreateTopic,
  onDeleteTopic,
  nuggetCounts,
  totalCount,
  search,
  onSearchChange,
}: TopicSidebarProps) {
  return (
    <aside className="w-56 shrink-0 space-y-3">
      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left",
          selectedTopicId === null
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <BookOpen className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Alle</span>
        <span className="text-xs tabular-nums">{totalCount}</span>
      </button>

      {/* Topic list */}
      <div className="space-y-0.5">
        {topics.map((topic) => (
          <div key={topic.id} className="group relative">
            <button
              onClick={() => onSelect(topic.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                selectedTopicId === topic.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: topic.color }}
              />
              <span className="flex-1 truncate">
                {topic.emoji ? `${topic.emoji} ` : ""}
                {topic.name}
              </span>
              <span className="text-xs tabular-nums">{nuggetCounts[topic.id] || 0}</span>
            </button>
            {onDeleteTopic && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Topic löschen?")) onDeleteTopic(topic.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add topic */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-xs text-muted-foreground"
        onClick={onCreateTopic}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Neues Topic
      </Button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Suche..."
          className="pl-8 h-8 text-xs"
        />
      </div>
    </aside>
  );
}
