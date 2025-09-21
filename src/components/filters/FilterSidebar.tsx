import React, { useState, useEffect } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFilters } from '@/hooks/useFilters';
import { PriceRangeInput } from './PriceRangeInput';
import { CheckboxFilter } from './CheckboxFilter';
import { useIsMobile } from '@/hooks/use-mobile';

interface FilterCategory {
  id: string;
  label: string;
  count?: number;
}

interface FilterSidebarProps {
  categories: FilterCategory[];
  brands: FilterCategory[];
  className?: string;
}

export function FilterSidebar({ categories, brands, className }: FilterSidebarProps) {
  const { filters, updateFilter, updateFilters, resetFilters } = useFilters();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Parse price range from filters
  const priceRange = {
    min: filters.minPrice || '',
    max: filters.maxPrice || ''
  };

  // Parse selected categories and brands
  const selectedCategories = filters.category ? filters.category.split(',') : [];
  const selectedBrands = filters.brand ? filters.brand.split(',') : [];

  // Handle price range changes
  const handlePriceChange = (range: { min: string; max: string }) => {
    updateFilters({
      minPrice: range.min,
      maxPrice: range.max
    });
  };

  // Handle category changes
  const handleCategoriesChange = (values: string[]) => {
    updateFilter('category', values.join(','));
  };

  // Handle brand changes
  const handleBrandsChange = (values: string[]) => {
    updateFilter('brand', values.join(','));
  };

  // Handle global reset
  const handleReset = () => {
    resetFilters();
  };

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.brand ||
    filters.minPrice ||
    filters.maxPrice ||
    (filters.sortBy && filters.sortBy !== 'relevance')
  );

  // Filter content component
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Reset Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-sm"
            aria-label="Clear all filters"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Price Range */}
      <PriceRangeInput
        value={priceRange}
        onChange={handlePriceChange}
        label="Price Range"
      />

      {/* Categories */}
      <CheckboxFilter
        title="Categories"
        options={categories}
        selectedValues={selectedCategories}
        onChange={handleCategoriesChange}
      />

      {/* Brands */}
      <CheckboxFilter
        title="Brands"
        options={brands}
        selectedValues={selectedBrands}
        onChange={handleBrandsChange}
      />
    </div>
  );

  // Mobile implementation with drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            aria-label="Open filters"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary" aria-label="Active filters" />
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent
          side="left"
          className="w-full sm:w-80 p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-title"
        >
          <SheetHeader className="p-4 border-b">
            <SheetTitle id="filter-title">Filters</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-full">
            <div className="p-4">
              <FilterContent />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop implementation with sidebar
  return (
    <Sidebar className={`w-80 ${className}`}>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-sm h-8 px-2"
              aria-label="Clear all filters"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <ScrollArea className="h-full">
          <div className="p-4">
            <FilterContent />
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

// Export hook for managing body scroll lock
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLocked]);
}