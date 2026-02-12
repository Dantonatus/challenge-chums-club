import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QuarterHeader } from '@/components/planning/QuarterHeader';
import { QuarterCalendar } from '@/components/planning/QuarterCalendar';
import { HalfYearCalendar } from '@/components/planning/HalfYearCalendar';
import { MilestoneQuickAdd } from '@/components/planning/MilestoneQuickAdd';
import { MilestoneSheet } from '@/components/planning/MilestoneSheet';
import { ClientEditSheet } from '@/components/planning/ClientEditSheet';
import { PlanningEmptyState } from '@/components/planning/PlanningEmptyState';
import { useMilestonesByClient } from '@/hooks/useMilestones';
import { useClients } from '@/hooks/useClients';
import { 
  getCurrentQuarter, 
  getCurrentHalfYear,
  Quarter, 
  HalfYear,
  ViewMode,
  MilestoneWithClient,
  Client,
  quarterToHalfYear,
  halfYearToQuarter
} from '@/lib/planning/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { MonthView } from '@/components/planning/MonthView';

const ProjectPlanningPage = lazy(() => import('./ProjectPlanningPage'));

export default function PlanningPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('quarter');
  const [quarter, setQuarter] = useState<Quarter>(getCurrentQuarter);
  const [halfYear, setHalfYear] = useState<HalfYear>(getCurrentHalfYear);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithClient | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const { byClient, milestones, isLoading } = useMilestonesByClient(
    viewMode === 'halfyear' ? { halfYear } : { quarter }
  );
  const { clients } = useClients();
  const isMobile = useIsMobile();

  const isEmpty = milestones.length === 0 && clients.length === 0;

  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode === 'halfyear' && viewMode === 'quarter') {
      setHalfYear(quarterToHalfYear(quarter));
    } else if (newMode === 'quarter' && viewMode === 'halfyear') {
      setQuarter(halfYearToQuarter(halfYear));
    }
    setViewMode(newMode);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="gantt">Projektplanung</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
                halfYear={halfYear}
                onViewModeChange={handleViewModeChange}
                onQuarterChange={setQuarter}
                onHalfYearChange={setHalfYear}
                onAddClick={() => setShowQuickAdd(true)}
                clientData={byClient}
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
              ) : viewMode === 'halfyear' ? (
                <HalfYearCalendar
                  halfYear={halfYear}
                  clientData={byClient}
                  onMilestoneClick={setSelectedMilestone}
                  onClientClick={setSelectedClient}
                  showLabels={showLabels}
                />
              ) : (
                <QuarterCalendar
                  quarter={quarter}
                  clientData={byClient}
                  onMilestoneClick={setSelectedMilestone}
                  onClientClick={setSelectedClient}
                  showLabels={showLabels}
                />
              )}

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
          )}
        </TabsContent>

        <TabsContent value="gantt">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <ProjectPlanningPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
