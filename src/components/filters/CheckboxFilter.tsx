import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface CheckboxFilterProps {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

export function CheckboxFilter({
  title,
  options,
  selectedValues,
  onChange,
  className
}: CheckboxFilterProps) {
  const [localSelectedValues, setLocalSelectedValues] = useState<string[]>(selectedValues);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedValues(selectedValues);
  }, [selectedValues]);

  // Debounced update to parent (100ms for quick multi-selection bundling)
  const debouncedUpdate = useDebouncedCallback(
    (values: string[]) => {
      onChange(values);
    },
    100
  );

  const handleToggle = (optionId: string, checked: boolean) => {
    const updatedValues = checked
      ? [...localSelectedValues, optionId]
      : localSelectedValues.filter(id => id !== optionId);
    
    // Immediate visual feedback
    setLocalSelectedValues(updatedValues);
    
    // Debounced URL update
    debouncedUpdate(updatedValues);
  };

  const handleSelectAll = () => {
    const allOptionIds = options.map(option => option.id);
    setLocalSelectedValues(allOptionIds);
    debouncedUpdate(allOptionIds);
  };

  const handleClearAll = () => {
    setLocalSelectedValues([]);
    debouncedUpdate([]);
  };

  const isAllSelected = localSelectedValues.length === options.length;
  const hasSelection = localSelectedValues.length > 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium leading-none">
          {title}
        </h3>
        
        {/* Bulk actions */}
        <div className="flex gap-2 text-xs">
          {!isAllSelected && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-primary hover:text-primary/80 transition-colors"
              aria-label={`Select all ${title.toLowerCase()}`}
            >
              All
            </button>
          )}
          
          {hasSelection && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Clear all ${title.toLowerCase()} selections`}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const isChecked = localSelectedValues.includes(option.id);
          const checkboxId = `filter-${title.toLowerCase().replace(/\s+/g, '-')}-${option.id}`;
          
          return (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={checkboxId}
                checked={isChecked}
                onCheckedChange={(checked) => 
                  handleToggle(option.id, checked === true)
                }
                aria-describedby={option.count ? `${checkboxId}-count` : undefined}
              />
              
              <Label
                htmlFor={checkboxId}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
              >
                <span className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {option.count !== undefined && (
                    <span 
                      id={`${checkboxId}-count`}
                      className="text-xs text-muted-foreground ml-2"
                      aria-label={`${option.count} items`}
                    >
                      ({option.count})
                    </span>
                  )}
                </span>
              </Label>
            </div>
          );
        })}
      </div>

      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite">
        {hasSelection 
          ? `${localSelectedValues.length} ${title.toLowerCase()} selected: ${localSelectedValues.map(id => options.find(opt => opt.id === id)?.label).filter(Boolean).join(', ')}`
          : `No ${title.toLowerCase()} selected`
        }
      </div>
    </div>
  );
}