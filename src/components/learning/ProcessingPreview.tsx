import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Plus } from "lucide-react";
import { LearningTopic } from "@/hooks/useLearningTopics";

export interface ProcessedResult {
  title: string;
  summary: string;
  key_points: string[];
  suggested_topic: string;
  tags: string[];
}

interface ProcessingPreviewProps {
  result: ProcessedResult;
  originalText: string;
  topics: LearningTopic[];
  onSave: (data: {
    title: string;
    summary: string;
    key_points: string[];
    topic_id: string | null;
    new_topic_name?: string;
    tags: string[];
    content: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function ProcessingPreview({ result, originalText, topics, onSave, onCancel, isSaving }: ProcessingPreviewProps) {
  const [title, setTitle] = useState(result.title);
  const [summary, setSummary] = useState(result.summary);
  const [keyPoints, setKeyPoints] = useState(result.key_points);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("__new__");
  const [tags, setTags] = useState(result.tags);
  const [tagInput, setTagInput] = useState("");

  // Try to match suggested topic to existing
  useState(() => {
    const match = topics.find(
      (t) => t.name.toLowerCase() === result.suggested_topic.toLowerCase()
    );
    if (match) setSelectedTopicId(match.id);
  });

  const handleSave = () => {
    onSave({
      title,
      summary,
      key_points: keyPoints.filter(Boolean),
      topic_id: selectedTopicId === "__new__" ? null : selectedTopicId,
      new_topic_name: selectedTopicId === "__new__" ? result.suggested_topic : undefined,
      tags,
      content: originalText,
    });
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...keyPoints];
    updated[index] = value;
    setKeyPoints(updated);
  };

  const removeKeyPoint = (index: number) => setKeyPoints(keyPoints.filter((_, i) => i !== index));
  const addKeyPoint = () => setKeyPoints([...keyPoints, ""]);

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Vorschau bearbeiten
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Titel</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {/* Summary */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Zusammenfassung</label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-[60px]" />
        </div>

        {/* Topic */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Topic</label>
          <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
            <SelectTrigger>
              <SelectValue placeholder="Topic wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__new__">
                + Neu: {result.suggested_topic}
              </SelectItem>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.emoji ? `${t.emoji} ` : ""}{t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Key Points */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Kernpunkte</label>
          <div className="space-y-2">
            {keyPoints.map((kp, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={kp}
                  onChange={(e) => updateKeyPoint(i, e.target.value)}
                  className="text-sm"
                />
                <Button variant="ghost" size="icon" onClick={() => removeKeyPoint(i)} className="shrink-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addKeyPoint} className="gap-1">
              <Plus className="h-3 w-3" /> Punkt hinzufügen
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer gap-1" onClick={() => removeTag(tag)}>
                {tag} <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Tag hinzufügen..."
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
            <Button variant="outline" size="sm" onClick={addTag}>+</Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={!title.trim() || isSaving} className="gap-2 flex-1">
            <Save className="h-4 w-4" /> Speichern
          </Button>
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        </div>
      </CardContent>
    </Card>
  );
}
