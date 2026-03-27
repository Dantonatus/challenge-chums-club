import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuarterHeader } from '@/components/planning/QuarterHeader';
import { QuarterCalendar } from '@/components/planning/QuarterCalendar';
import { SixMonthCalendar } from '@/components/planning/SixMonthCalendar';
import { MilestoneQuickAdd } from '@/components/planning/MilestoneQuickAdd';
import { MilestoneSheet } from '@/components/planning/MilestoneSheet';
import { ClientEditSheet } from '@/components/planning/ClientEditSheet';
import { PlanningEmptyState } from '@/components/planning/PlanningEmptyState';
import { GanttPage } from '@/components/planning/gantt/GanttPage';
import { useMilestonesByClient } from '@/hooks/useMilestones';
import { useClients } from '@/hooks/useClients';
import { 
  getCurrentQuarter, 
  getCurrentSixMonth,
  Quarter, 
  SixMonthWindow,
  ViewMode,
  MilestoneWithClient,
  Client,
  quarterToSixMonth,
  sixMonthToQuarter
} from '@/lib/planning/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { MonthView } from '@/components/planning/MonthView';

export default function PlanningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'horizon';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });
  const [viewMode, setViewMode] = useState<ViewMode>('quarter');
  const [quarter, setQuarter] = useState<Quarter>(getCurrentQuarter);
  const [sixMonth, setSixMonth] = useState<SixMonthWindow>(getCurrentSixMonth);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithClient | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const { byClient, milestones, isLoading } = useMilestonesByClient(
    viewMode === '6month' ? { sixMonth } : { quarter }
  );
  const { clients } = useClients();
  const isMobile = useIsMobile();

  // Merge all clients into byClient so rows are always visible
  const mergedClientData = useMemo(() => {
    const clientMap = new Map<string, { client: Client; milestones: MilestoneWithClient[] }>();
    
    // Add clients that have milestones
    for (const entry of byClient) {
      clientMap.set(entry.client.id, entry);
    }
    
    // Add clients without milestones in this range
    for (const client of clients) {
      if (!clientMap.has(client.id)) {
        clientMap.set(client.id, { client: client as Client, milestones: [] });
      }
    }
    
    return Array.from(clientMap.values());
  }, [byClient, clients]);

  const isEmpty = milestones.length === 0 && clients.length === 0;

  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode === '6month' && viewMode === 'quarter') {
      setSixMonth(quarterToSixMonth(quarter));
    } else if (newMode === 'quarter' && viewMode === '6month') {
      setQuarter(sixMonthToQuarter(sixMonth));
    }
    setViewMode(newMode);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="horizon">Planung</TabsTrigger>
          <TabsTrigger value="gantt">Projektplanung</TabsTrigger>
        </TabsList>

        <TabsContent value="horizon">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-[600px] w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <QuarterHeader
                viewMode={viewMode}
                quarter={quarter}
                sixMonth={sixMonth}
                onViewModeChange={handleViewModeChange}
                onQuarterChange={setQuarter}
                onSixMonthChange={setSixMonth}
                onAddClick={() => setShowQuickAdd(true)}
                clientData={mergedClientData}
                showLabels={showLabels}
                onShowLabelsChange={setShowLabels}
              />

              {isEmpty ? (
                <PlanningEmptyState onAddClick={() => setShowQuickAdd(true)} />
              ) : isMobile ? (
                <MonthView
                  quarter={quarter}
                  milestones={milestones}
                  onMilestoneClick={setSelectedMilestone}
                  onClientClick={setSelectedClient}
                />
              ) : viewMode === '6month' ? (
                <SixMonthCalendar
                  sixMonth={sixMonth}
                  clientData={mergedClientData}
                  onMilestoneClick={setSelectedMilestone}
                  onClientClick={setSelectedClient}
                  showLabels={showLabels}
                />
              ) : (
                <QuarterCalendar
                  quarter={quarter}
                  clientData={mergedClientData}
                  onMilestoneClick={setSelectedMilestone}
                  onClientClick={setSelectedClient}
                  showLabels={showLabels}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gantt">
          <GanttPage />
        </TabsContent>
      </Tabs>

      <MilestoneQuickAdd
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
      />

      <MilestoneSheet
        milestone={selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
      />

      <ClientEditSheet
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
