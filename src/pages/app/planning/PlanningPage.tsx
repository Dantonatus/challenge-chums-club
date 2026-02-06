import { useState } from 'react';
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

export default function PlanningPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('quarter');
  const [quarter, setQuarter] = useState<Quarter>(getCurrentQuarter);
  const [halfYear, setHalfYear] = useState<HalfYear>(getCurrentHalfYear);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithClient | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const { byClient, milestones, isLoading } = useMilestonesByClient(
    viewMode === 'halfyear' ? { halfYear } : { quarter }
  );
  const { clients } = useClients();
  const isMobile = useIsMobile();

  const isEmpty = milestones.length === 0 && clients.length === 0;

  // Handle view mode change - sync quarter/halfyear
  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode === 'halfyear' && viewMode === 'quarter') {
      setHalfYear(quarterToHalfYear(quarter));
    } else if (newMode === 'quarter' && viewMode === 'halfyear') {
      setQuarter(halfYearToQuarter(halfYear));
    }
    setViewMode(newMode);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
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
      />

      {isEmpty ? (
        <PlanningEmptyState onAddClick={() => setShowQuickAdd(true)} />
      ) : isMobile ? (
        <MonthView
          quarter={quarter}
          milestones={milestones}
          onMilestoneClick={setSelectedMilestone}
        />
      ) : viewMode === 'halfyear' ? (
        <HalfYearCalendar
          halfYear={halfYear}
          clientData={byClient}
          onMilestoneClick={setSelectedMilestone}
        />
      ) : (
        <QuarterCalendar
          quarter={quarter}
          clientData={byClient}
          onMilestoneClick={setSelectedMilestone}
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
    </div>
  );
}
