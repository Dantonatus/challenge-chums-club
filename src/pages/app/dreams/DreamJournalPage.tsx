import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DreamCapture } from '@/components/dreams/DreamCapture';
import { DreamTimeline } from '@/components/dreams/DreamTimeline';
import { DreamInsights } from '@/components/dreams/DreamInsights';
import { DreamDetailSheet } from '@/components/dreams/DreamDetailSheet';
import { DreamCalendar } from '@/components/dreams/DreamCalendar';
import { useDreamEntries } from '@/hooks/useDreamEntries';
import { DreamEntry } from '@/lib/dreams/types';
import { Moon, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DreamJournalPage() {
  const { entries, isLoading, create, update, remove } = useDreamEntries();
  const [selected, setSelected] = useState<DreamEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const filteredEntries = useMemo(() => {
    if (!selectedDate) return entries;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return entries.filter(e => e.entry_date === dateStr);
  }, [entries, selectedDate]);

  const handleSave = (data: Parameters<typeof create.mutate>[0]) => {
    const payload = selectedDate
      ? { ...data, entry_date: format(selectedDate, 'yyyy-MM-dd') }
      : data;
    create.mutate(payload as any, {
      onSuccess: () => toast.success('Traum gespeichert ✨'),
    });
  };

  const handleUpdate = (data: Partial<DreamEntry> & { id: string }) => {
    update.mutate(data, {
      onSuccess: () => {
        toast.success('Traum aktualisiert ✨');
        setSelected(null);
      },
    });
  };

  const handleDelete = (id: string) => {
    remove.mutate(id, { onSuccess: () => toast.success('Traum gelöscht') });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Moon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-serif font-bold">Traumtagebuch</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: Calendar */}
        <div className="space-y-4">
          <DreamCalendar
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* Right: Capture + Tabs */}
        <div className="space-y-6">
          <DreamCapture onSave={handleSave} isPending={create.isPending} selectedDate={selectedDate} />

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
                <DreamTimeline entries={filteredEntries} onSelect={setSelected} />
              )}
            </TabsContent>

            <TabsContent value="insights">
              <DreamInsights entries={entries} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <DreamDetailSheet
        dream={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
