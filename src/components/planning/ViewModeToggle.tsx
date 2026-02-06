import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ViewMode } from '@/lib/planning/types';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(v) => v && onChange(v as ViewMode)}
      className="border rounded-lg p-0.5"
    >
      <ToggleGroupItem 
        value="quarter" 
        className="text-xs px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        Quartal
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="halfyear" 
        className="text-xs px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        Halbjahr
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
