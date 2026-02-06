import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Download, Tag } from 'lucide-react';
import { 
  Quarter, 
  HalfYear,
  ViewMode,
  getQuarterLabel, 
  getHalfYearLabel,
  getPreviousQuarter, 
  getNextQuarter, 
  getPreviousHalfYear,
  getNextHalfYear,
  getCurrentQuarter, 
  getCurrentHalfYear,
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
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuarterHeaderProps {
  viewMode: ViewMode;
  quarter: Quarter;
  halfYear: HalfYear;
  onViewModeChange: (mode: ViewMode) => void;
  onQuarterChange: (quarter: Quarter) => void;
  onHalfYearChange: (halfYear: HalfYear) => void;
  onAddClick: () => void;
  clientData: Array<{ client: Client; milestones: MilestoneWithClient[] }>;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
}

export function QuarterHeader({ 
  viewMode,
  quarter, 
  halfYear,
  onViewModeChange,
  onQuarterChange, 
  onHalfYearChange,
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
    
  const isCurrentHalfYear =
    halfYear.year === getCurrentHalfYear().year &&
    halfYear.half === getCurrentHalfYear().half;

  const isCurrentPeriod = viewMode === 'halfyear' ? isCurrentHalfYear : isCurrentQuarter;

  const handlePrevious = () => {
    if (viewMode === 'halfyear') {
      onHalfYearChange(getPreviousHalfYear(halfYear));
    } else {
      onQuarterChange(getPreviousQuarter(quarter));
    }
  };

  const handleNext = () => {
    if (viewMode === 'halfyear') {
      onHalfYearChange(getNextHalfYear(halfYear));
    } else {
      onQuarterChange(getNextQuarter(quarter));
    }
  };

  const handleToday = () => {
    if (viewMode === 'halfyear') {
      onHalfYearChange(getCurrentHalfYear());
    } else {
      onQuarterChange(getCurrentQuarter());
    }
  };

  const handleExport = async (format: ExportFormat) => {
    await exportPlanningCanvas({
      elementId: 'planning-chart',
      format,
      filename: generateFilename(periodLabel),
      periodLabel,
    });
  };

  const periodLabel = viewMode === 'halfyear' 
    ? getHalfYearLabel(halfYear)
    : getQuarterLabel(quarter);

  const monthRange = viewMode === 'halfyear'
    ? getHalfYearMonthRange(halfYear)
    : getQuarterMonthRange(quarter);

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
          <p className="text-sm text-muted-foreground">{monthRange}</p>
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
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
        
        <Button onClick={onAddClick} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Meilenstein
        </Button>
      </div>
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

function getHalfYearMonthRange(halfYear: HalfYear): string {
  const startMonth = halfYear.half === 1 ? 0 : 6;
  const startDate = new Date(halfYear.year, startMonth, 1);
  const endDate = new Date(halfYear.year, startMonth + 5, 1);
  
  const startName = format(startDate, 'MMM', { locale: de });
  const endName = format(endDate, 'MMM', { locale: de });
  
  return `${startName} – ${endName}`;
}
