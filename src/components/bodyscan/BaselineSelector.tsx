import { cn } from '@/lib/utils';
import { formatGermanDate, type BaselineMode } from '@/lib/bodyscan/analytics';
import type { BodyScan } from '@/lib/bodyscan/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Check } from 'lucide-react';

interface Props {
  scans: BodyScan[];               // aufsteigend nach Datum
  currentScan: BodyScan;
  baselineMode: BaselineMode;
  customBaselineId: string | null;
  onChange: (mode: BaselineMode, customId?: string | null) => void;
}

export function BaselineSelector({ scans, currentScan, baselineMode, customBaselineId, onChange }: Props) {
  const modes: Array<{ id: BaselineMode; label: string }> = [
    { id: 'previous', label: 'Vorheriger Scan' },
    { id: 'first', label: 'Erster im Zeitraum' },
    { id: 'custom', label: 'Frei wählen' },
  ];

  const selectableScans = scans.filter(s => s.id !== currentScan.id);
  const activeCustom = selectableScans.find(s => s.id === customBaselineId) ?? null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-health-ink-subtle">
        Vergleich mit
      </span>
      <div
        role="tablist"
        aria-label="Vergleichsmodus"
        className="inline-flex rounded-full border border-health-hairline bg-health-canvas/60 p-0.5"
      >
        {modes.map(m => {
          const active = baselineMode === m.id;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(m.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-health-surface text-health-ink shadow-sm'
                  : 'text-health-ink-muted hover:text-health-ink',
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {baselineMode === 'custom' && selectableScans.length > 0 && (
        <Popover>
          <PopoverTrigger
            className="inline-flex items-center gap-1.5 rounded-full border border-health-hairline bg-health-surface px-3 py-1 text-xs text-health-ink hover:bg-health-canvas/50"
          >
            {activeCustom ? formatGermanDate(activeCustom.scan_date) : 'Scan wählen'}
            <ChevronDown className="h-3 w-3" />
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-64 w-64 overflow-y-auto p-1">
            <ul className="space-y-0.5">
              {selectableScans.map(s => {
                const active = s.id === customBaselineId;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => onChange('custom', s.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs hover:bg-muted',
                        active && 'bg-muted',
                      )}
                    >
                      <span>{formatGermanDate(s.scan_date)}</span>
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
