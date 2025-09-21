import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface PriceRangeInputProps {
  value: { min: string; max: string };
  onChange: (range: { min: string; max: string }) => void;
  currency?: string;
  label?: string;
}

export function PriceRangeInput({ 
  value, 
  onChange, 
  currency = '€',
  label = 'Price Range'
}: PriceRangeInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local state when props change
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced update to parent (500ms for price inputs)
  const debouncedUpdate = useDebouncedCallback(
    (range: { min: string; max: string }) => {
      onChange(range);
    },
    500
  );

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const updated = { ...localValue, min: newValue };
    setLocalValue(updated);
    debouncedUpdate(updated);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const updated = { ...localValue, max: newValue };
    setLocalValue(updated);
    debouncedUpdate(updated);
  };

  const handleMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(localValue);
    }
  };

  const handleMaxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(localValue);
    }
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </legend>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="price-min" className="text-xs text-muted-foreground">
            Min ({currency})
          </Label>
          <Input
            id="price-min"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={localValue.min}
            onChange={handleMinChange}
            onKeyDown={handleMinKeyDown}
            aria-label={`Minimum price in ${currency}`}
            className="text-sm"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="price-max" className="text-xs text-muted-foreground">
            Max ({currency})
          </Label>
          <Input
            id="price-max"
            type="number"
            min="0"
            step="0.01"
            placeholder="∞"
            value={localValue.max}
            onChange={handleMaxChange}
            onKeyDown={handleMaxKeyDown}
            aria-label={`Maximum price in ${currency}`}
            className="text-sm"
          />
        </div>
      </div>

      {/* Screen reader friendly description */}
      <div className="sr-only" aria-live="polite">
        {localValue.min || localValue.max 
          ? `Price range: ${localValue.min ? `from ${localValue.min} ${currency}` : 'no minimum'} ${localValue.max ? `to ${localValue.max} ${currency}` : 'no maximum'}`
          : 'No price range filter applied'
        }
      </div>
    </fieldset>
  );
}