import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Download, Tag } from 'lucide-react';
import { 
  Quarter, 
  SixMonthWindow,
  ViewMode,
  getQuarterLabel, 
  getSixMonthLabel,
  getPreviousQuarter, 
  getNextQuarter, 
  getPreviousSixMonth,
  getNextSixMonth,
  getCurrentQuarter, 
  getCurrentSixMonth,
  Client,
  MilestoneWithClient
} from '@/lib/planning/types';
import { ViewModeToggle } from './ViewModeToggle';
import { ExportDialog, ExportFormat } from './ExportDialog';
import { exportPlanningCanvas, generateFilename } from '@/lib/planning/exportCanvas';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuarterHeaderProps {
  viewMode: ViewMode;
  quarter: Quarter;
  sixMonth: SixMonthWindow;
  onViewModeChange: (mode: ViewMode) => void;
  onQuarterChange: (quarter: Quarter) => void;
  onSixMonthChange: (sixMonth: SixMonthWindow) => void;
  onAddClick: () => void;
  clientData: Array<{ client: Client; milestones: MilestoneWithClient[] }>;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
}

export function QuarterHeader({ 
  viewMode,
  quarter, 
  sixMonth,
  onViewModeChange,
  onQuarterChange, 
  onSixMonthChange,
  onAddClick,
  clientData,
  showLabels,
  onShowLabelsChange
}: QuarterHeaderProps) {
  const isMobile = useIsMobile();
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const isCurrentQuarter = 
    quarter.year === getCurrentQuarter().year && 
    quarter.quarter === getCurrentQuarter().quarter;
    
  const isCurrentSixMonth =
    sixMonth.year === getCurrentSixMonth().year &&
    sixMonth.startMonth === getCurrentSixMonth().startMonth;

  const isCurrentPeriod = viewMode === '6month' ? isCurrentSixMonth : isCurrentQuarter;

  const handlePrevious = () => {
    if (viewMode === '6month') {
      onSixMonthChange(getPreviousSixMonth(sixMonth));
    } else {
      onQuarterChange(getPreviousQuarter(quarter));
    }
  };

  const handleNext = () => {
    if (viewMode === '6month') {
      onSixMonthChange(getNextSixMonth(sixMonth));
    } else {
      onQuarterChange(getNextQuarter(quarter));
    }
  };

  const handleToday = () => {
    if (viewMode === '6month') {
      onSixMonthChange(getCurrentSixMonth());
    } else {
      onQuarterChange(getCurrentQuarter());
    }
  };

  const periodLabel = viewMode === '6month' 
    ? getSixMonthLabel(sixMonth)
    : getQuarterLabel(quarter);

  const monthRange = viewMode === '6month'
    ? '' // Already included in getSixMonthLabel
    : getQuarterMonthRange(quarter);

  const handleExport = async (format: ExportFormat) => {
    await exportPlanningCanvas({
      elementId: 'planning-chart',
      format,
      filename: generateFilename(periodLabel),
      periodLabel,
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          aria-label="Vorheriger Zeitraum"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="text-center min-w-[140px]">
          <h1 className="text-xl font-bold">{periodLabel}</h1>
          {monthRange && <p className="text-sm text-muted-foreground">{monthRange}</p>}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          aria-label="Nächster Zeitraum"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {!isMobile && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-background">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <Switch
                      id="show-labels"
                      checked={showLabels}
                      onCheckedChange={onShowLabelsChange}
                      className="scale-75"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Meilenstein-Labels anzeigen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
          </>
        )}
        
        {!isCurrentPeriod && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Heute
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportDialog(true)}
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        
        <Button onClick={onAddClick} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Meilenstein
        </Button>
      </div>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        periodLabel={periodLabel}
      />
    </div>
  );
}

function getQuarterMonthRange(quarter: Quarter): string {
  const startMonth = (quarter.quarter - 1) * 3;
  const startDate = new Date(quarter.year, startMonth, 1);
  const endDate = new Date(quarter.year, startMonth + 2, 1);
  
  const startName = format(startDate, 'MMM', { locale: de });
  const endName = format(endDate, 'MMM', { locale: de });
  
  return `${startName} – ${endName}`;
}
