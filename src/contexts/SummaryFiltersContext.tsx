import { createContext, useContext, ReactNode } from 'react';
import { useSummaryFilters } from '@/hooks/useSummaryFilters';

type SummaryFiltersContextType = ReturnType<typeof useSummaryFilters>;

const SummaryFiltersContext = createContext<SummaryFiltersContextType | undefined>(undefined);

interface SummaryFiltersProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the Summary page to provide centralized filter state
 * This ensures all components use the same Single Source of Truth for filters
 */
export function SummaryFiltersProvider({ children }: SummaryFiltersProviderProps) {
  const summaryFilters = useSummaryFilters();

  return (
    <SummaryFiltersContext.Provider value={summaryFilters}>
      {children}
    </SummaryFiltersContext.Provider>
  );
}

/**
 * Hook to access the centralized summary filters state
 * Must be used within SummaryFiltersProvider
 */
export function useSummaryFiltersContext() {
  const context = useContext(SummaryFiltersContext);
  if (!context) {
    throw new Error('useSummaryFiltersContext must be used within SummaryFiltersProvider');
  }
  return context;
}