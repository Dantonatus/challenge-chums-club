import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ComparisonMode,
  Period,
  PeriodMode,
  getPresetPeriod,
  getPreviousPeriod,
} from '@/lib/health/periods';

interface ReportingContextValue {
  period: Period;
  previousPeriod: Period;
  comparison: ComparisonMode;
  setPeriodMode: (mode: PeriodMode) => void;
  setCustomPeriod: (start: Date, end: Date) => void;
  setComparison: (c: ComparisonMode) => void;
  now: Date;
}

const ReportingContext = createContext<ReportingContextValue | undefined>(undefined);

const STORAGE_KEY = 'health-reporting-state-v1';

interface Persisted {
  mode: PeriodMode;
  comparison: ComparisonMode;
  customStart?: string;
  customEnd?: string;
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export function ReportingProvider({ children }: { children: React.ReactNode }) {
  const now = useMemo(() => new Date(), []);
  const persisted = useMemo(loadPersisted, []);
  const initialMode: PeriodMode = persisted?.mode ?? '12w';
  const [comparison, setComparisonState] = useState<ComparisonMode>(persisted?.comparison ?? 'previous');

  const [period, setPeriod] = useState<Period>(() => {
    if (persisted?.mode === 'custom' && persisted.customStart && persisted.customEnd) {
      return {
        start: new Date(persisted.customStart),
        end: new Date(persisted.customEnd),
        mode: 'custom',
      };
    }
    return getPresetPeriod(initialMode, now);
  });

  const persist = useCallback((next: Persisted) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }, []);

  const setPeriodMode = useCallback(
    (mode: PeriodMode) => {
      const next = getPresetPeriod(mode, now);
      setPeriod(next);
      persist({ mode, comparison });
    },
    [now, comparison, persist],
  );

  const setCustomPeriod = useCallback(
    (start: Date, end: Date) => {
      const next: Period = { start, end, mode: 'custom' };
      setPeriod(next);
      persist({
        mode: 'custom',
        comparison,
        customStart: start.toISOString(),
        customEnd: end.toISOString(),
      });
    },
    [comparison, persist],
  );

  const setComparison = useCallback(
    (c: ComparisonMode) => {
      setComparisonState(c);
      persist({
        mode: period.mode,
        comparison: c,
        customStart: period.mode === 'custom' ? period.start.toISOString() : undefined,
        customEnd: period.mode === 'custom' ? period.end.toISOString() : undefined,
      });
    },
    [period, persist],
  );

  const previousPeriod = useMemo(() => getPreviousPeriod(period), [period]);

  useEffect(() => {
    // Refresh on visibility change so "now" reflects real time on long sessions
  }, []);

  const value = useMemo<ReportingContextValue>(
    () => ({ period, previousPeriod, comparison, setPeriodMode, setCustomPeriod, setComparison, now }),
    [period, previousPeriod, comparison, setPeriodMode, setCustomPeriod, setComparison, now],
  );

  return <ReportingContext.Provider value={value}>{children}</ReportingContext.Provider>;
}

export function useReporting() {
  const ctx = useContext(ReportingContext);
  if (!ctx) throw new Error('useReporting must be used within ReportingProvider');
  return ctx;
}
