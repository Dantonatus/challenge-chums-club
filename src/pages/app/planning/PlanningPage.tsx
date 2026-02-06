import { useState } from 'react';
import { QuarterHeader } from '@/components/planning/QuarterHeader';
import { QuarterCalendar } from '@/components/planning/QuarterCalendar';
import { MilestoneQuickAdd } from '@/components/planning/MilestoneQuickAdd';
import { MilestoneSheet } from '@/components/planning/MilestoneSheet';
import { PlanningEmptyState } from '@/components/planning/PlanningEmptyState';
import { useMilestonesByClient } from '@/hooks/useMilestones';
import { useClients } from '@/hooks/useClients';
import { getCurrentQuarter, Quarter, MilestoneWithClient } from '@/lib/planning/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { MonthView } from '@/components/planning/MonthView';

export default function PlanningPage() {
  const [quarter, setQuarter] = useState<Quarter>(getCurrentQuarter);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithClient | null>(null);
  
  const { byClient, milestones, isLoading } = useMilestonesByClient(quarter);
  const { clients } = useClients();
  const isMobile = useIsMobile();

  const isEmpty = milestones.length === 0 && clients.length === 0;

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
        quarter={quarter}
        onQuarterChange={setQuarter}
        onAddClick={() => setShowQuickAdd(true)}
      />

      {isEmpty ? (
        <PlanningEmptyState onAddClick={() => setShowQuickAdd(true)} />
      ) : isMobile ? (
        <MonthView
          quarter={quarter}
          milestones={milestones}
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
