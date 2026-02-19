import { useState, useMemo } from "react";
import { PasteCapture } from "@/components/learning/PasteCapture";
import { ProcessingPreview, ProcessedResult } from "@/components/learning/ProcessingPreview";
import { NuggetCard } from "@/components/learning/NuggetCard";
import { TopicChips } from "@/components/learning/TopicChips";
import { TopicSidebar } from "@/components/learning/TopicSidebar";
import { CreateTopicDialog } from "@/components/learning/CreateTopicDialog";
import { useLearningTopics } from "@/hooks/useLearningTopics";
import { useLearningNuggets } from "@/hooks/useLearningNuggets";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function LearningPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<ProcessedResult | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createTopicOpen, setCreateTopicOpen] = useState(false);
  const [pendingTopicName, setPendingTopicName] = useState<string | undefined>();
  const isMobile = useIsMobile();

  const { topics, create: createTopic, remove: removeTopic } = useLearningTopics();
  const { nuggets, isLoading, create: createNugget, togglePin, remove } = useLearningNuggets(selectedTopicId, search);

  // Count nuggets per topic (unfiltered)
  const allNuggets = useLearningNuggets(undefined, undefined);
  const nuggetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of allNuggets.nuggets) {
      if (n.topic_id) counts[n.topic_id] = (counts[n.topic_id] || 0) + 1;
    }
    return counts;
  }, [allNuggets.nuggets]);

  const handleProcess = async (text: string) => {
    setIsProcessing(true);
    setOriginalText(text);
    try {
      const { data, error } = await supabase.functions.invoke("process-learning-content", {
        body: { content: text, existingTopics: topics },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProcessedResult(data as ProcessedResult);
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message || "Verarbeitung fehlgeschlagen", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (data: {
    title: string;
    summary: string;
    key_points: string[];
    topic_id: string | null;
    new_topic_name?: string;
    tags: string[];
    content: string;
  }) => {
    try {
      let topicId = data.topic_id;
      if (!topicId && data.new_topic_name) {
        const newTopic = await createTopic.mutateAsync({ name: data.new_topic_name });
        topicId = newTopic.id;
      }
      await createNugget.mutateAsync({
        title: data.title,
        summary: data.summary,
        key_points: data.key_points,
        topic_id: topicId,
        tags: data.tags,
        content: data.content,
        source: null,
        is_pinned: false,
      });
      setProcessedResult(null);
      setOriginalText("");
      toast({ title: "Gespeichert!", description: "Nugget wurde erstellt." });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateTopic = (topic: { name: string; emoji?: string; color?: string }) => {
    createTopic.mutate(topic);
  };

  const nuggetFeed = (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : nuggets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Nuggets. Paste deinen ersten Text oben!</p>
        </div>
      ) : (
        nuggets.map((nugget) => (
          <NuggetCard
            key={nugget.id}
            nugget={nugget}
            topic={topics.find((t) => t.id === nugget.topic_id)}
            onTogglePin={(id, pinned) => togglePin.mutate({ id, is_pinned: pinned })}
            onDelete={(id) => {
              if (confirm("Nugget wirklich löschen?")) remove.mutate(id);
            }}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Learning</h1>
      </div>

      {/* Paste Capture or Preview */}
      {processedResult ? (
        <ProcessingPreview
          result={processedResult}
          originalText={originalText}
          topics={topics}
          onSave={handleSave}
          onCancel={() => { setProcessedResult(null); setOriginalText(""); }}
          isSaving={createNugget.isPending}
        />
      ) : (
        <PasteCapture onProcess={handleProcess} isProcessing={isProcessing} />
      )}

      {/* Desktop: sidebar + feed | Mobile: chips + search + feed */}
      {isMobile ? (
        <div className="space-y-3">
          <TopicChips
            topics={topics}
            selectedTopicId={selectedTopicId}
            onSelect={setSelectedTopicId}
            onCreateTopic={() => { setPendingTopicName(undefined); setCreateTopicOpen(true); }}
            nuggetCounts={nuggetCounts}
            totalCount={allNuggets.nuggets.length}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche in Nuggets..."
              className="pl-9"
            />
          </div>
          {nuggetFeed}
        </div>
      ) : (
        <div className="flex gap-6">
          <TopicSidebar
            topics={topics}
            selectedTopicId={selectedTopicId}
            onSelect={setSelectedTopicId}
            onCreateTopic={() => { setPendingTopicName(undefined); setCreateTopicOpen(true); }}
            onDeleteTopic={(id) => {
              if (confirm("Topic löschen?")) removeTopic.mutate(id);
            }}
            nuggetCounts={nuggetCounts}
            totalCount={allNuggets.nuggets.length}
            search={search}
            onSearchChange={setSearch}
          />
          <div className="flex-1 min-w-0">
            {nuggetFeed}
          </div>
        </div>
      )}

      <CreateTopicDialog
        open={createTopicOpen}
        onOpenChange={setCreateTopicOpen}
        onSave={handleCreateTopic}
        defaultName={pendingTopicName}
      />
    </div>
  );
}
