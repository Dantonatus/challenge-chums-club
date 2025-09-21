import { useState, useCallback, useMemo } from 'react';
import { useDateRange } from '@/contexts/DateRangeContext';

export interface SummaryFilters {
  participants: string[];
  challengeTypes: string[];
  groups: string[];
  // Date range is handled by DateRangeContext
}

interface UseSummaryFiltersReturn {
  filters: SummaryFilters;
  setFilters: React.Dispatch<React.SetStateAction<SummaryFilters>>;
  updateFilter: <K extends keyof SummaryFilters>(key: K, value: SummaryFilters[K]) => void;
  resetAllFilters: () => void;
  hasActiveFilters: boolean;
  // Combined filters including date range for data fetching
  allFilters: SummaryFilters & { startDate: string; endDate: string };
}

const defaultFilters: SummaryFilters = {
  participants: [],
  challengeTypes: [],
  groups: []
};

/**
 * Centralized filter state management for the Summary page
 * This is the Single Source of Truth (SSoT) for all filtering
 */
export function useSummaryFilters(): UseSummaryFiltersReturn {
  const [filters, setFilters] = useState<SummaryFilters>(defaultFilters);
  const { start, end } = useDateRange();

  const updateFilter = useCallback(<K extends keyof SummaryFilters>(
    key: K, 
    value: SummaryFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetAllFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.participants.length > 0 || 
           filters.challengeTypes.length > 0 || 
           filters.groups.length > 0;
  }, [filters]);

  // Combined filters including date range for unified data fetching
  const allFilters = useMemo(() => ({
    ...filters,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  }), [filters, start, end]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetAllFilters,
    hasActiveFilters,
    allFilters
  };
}