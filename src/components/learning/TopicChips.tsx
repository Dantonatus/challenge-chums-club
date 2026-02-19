import { Badge } from "@/components/ui/badge";
import { LearningTopic } from "@/hooks/useLearningTopics";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopicChipsProps {
  topics: LearningTopic[];
  selectedTopicId: string | null;
  onSelect: (topicId: string | null) => void;
  onCreateTopic: () => void;
  nuggetCounts: Record<string, number>;
  totalCount: number;
}

export function TopicChips({ topics, selectedTopicId, onSelect, onCreateTopic, nuggetCounts, totalCount }: TopicChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <Badge
        variant={selectedTopicId === null ? "default" : "outline"}
        className="cursor-pointer whitespace-nowrap shrink-0"
        onClick={() => onSelect(null)}
      >
        Alle ({totalCount})
      </Badge>
      {topics.map((topic) => (
        <Badge
          key={topic.id}
          variant={selectedTopicId === topic.id ? "default" : "outline"}
          className="cursor-pointer whitespace-nowrap shrink-0"
          style={
            selectedTopicId === topic.id
              ? { backgroundColor: topic.color, borderColor: topic.color }
              : { borderColor: topic.color, color: topic.color }
          }
          onClick={() => onSelect(topic.id)}
        >
          {topic.emoji ? `${topic.emoji} ` : ""}{topic.name} ({nuggetCounts[topic.id] || 0})
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="shrink-0 h-6 px-2 text-xs" onClick={onCreateTopic}>
        <Plus className="h-3 w-3 mr-1" /> Topic
      </Button>
    </div>
  );
}
