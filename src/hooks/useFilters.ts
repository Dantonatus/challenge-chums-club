import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export function useFilters() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get current filters from URL
  const filters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || '',
    page: searchParams.get('page') || '1',
  };

  // Update a single filter
  const updateFilter = useCallback((key: string, value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (value) {
      newSearchParams.set(key, value);
    } else {
      newSearchParams.delete(key);
    }
    
    // Reset to page 1 when filtering (except for page changes)
    if (key !== 'page') {
      newSearchParams.delete('page');
    }

    // Use replace to avoid cluttering browser history
    navigate(`?${newSearchParams.toString()}`, { 
      replace: true,
      // Preserve scroll position during filter updates
      state: { scroll: false }
    });
  }, [searchParams, navigate]);

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });
    
    // Reset to page 1 when batch updating filters
    newSearchParams.delete('page');

    navigate(`?${newSearchParams.toString()}`, { 
      replace: true,
      state: { scroll: false }
    });
  }, [searchParams, navigate]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    navigate('/', { 
      replace: true,
      state: { scroll: false }
    });
  }, [navigate]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
  };
}