import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/hooks/useFilters';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

export function SearchBar() {
  const { filters, updateFilter } = useFilters();
  const [localValue, setLocalValue] = useState(filters.search || '');

  // Debounced update to URL parameters
  const debouncedUpdateFilter = useDebouncedCallback(
    (value: string) => {
      updateFilter('search', value);
    },
    300
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    debouncedUpdateFilter(value);
  };

  const handleClear = () => {
    setLocalValue('');
    updateFilter('search', '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Force immediate update on Enter
      updateFilter('search', localValue);
    }
  };

  return (
    <div role="search" className="relative max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products..."
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search products"
          className="pl-9 pr-9"
        />
        {localValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}