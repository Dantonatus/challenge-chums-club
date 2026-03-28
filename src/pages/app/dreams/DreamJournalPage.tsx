import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DreamCapture } from '@/components/dreams/DreamCapture';
import { DreamTimeline } from '@/components/dreams/DreamTimeline';
import { DreamInsights } from '@/components/dreams/DreamInsights';
import { DreamDetailSheet } from '@/components/dreams/DreamDetailSheet';
import { useDreamEntries } from '@/hooks/useDreamEntries';
import { DreamEntry } from '@/lib/dreams/types';
import { Moon, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function DreamJournalPage() {
  const { entries, isLoading, create, remove } = useDreamEntries();
  const [selected, setSelected] = useState<DreamEntry | null>(null);

  const handleSave = (data: Parameters<typeof create.mutate>[0]) => {
    create.mutate(data as any, {
      onSuccess: () => toast.success('Traum gespeichert ✨'),
    });
  };

  const handleDelete = (id: string) => {
    remove.mutate(id, { onSuccess: () => toast.success('Traum gelöscht') });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Moon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-serif font-bold">Traumtagebuch</h1>
      </div>

      <DreamCapture onSave={handleSave} isPending={create.isPending} />

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Moon className="w-3.5 h-3.5" /> Träume
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Laden…</div>
          ) : (
            <DreamTimeline entries={entries} onSelect={setSelected} />
          )}
        </TabsContent>

        <TabsContent value="insights">
          <DreamInsights entries={entries} />
        </TabsContent>
      </Tabs>

      <DreamDetailSheet
        dream={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
