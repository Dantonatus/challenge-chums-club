import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";

interface LegendItem {
  name: string;
  color: string;
  value?: number;
}

interface InteractiveLegendProps {
  items: LegendItem[];
  onToggle: (name: string, visible: boolean) => void;
  className?: string;
}

export function InteractiveLegend({ items, onToggle, className = "" }: InteractiveLegendProps) {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(
    new Set(items.map(item => item.name))
  );

  const handleToggle = (name: string) => {
    const newVisible = new Set(visibleItems);
    if (newVisible.has(name)) {
      newVisible.delete(name);
    } else {
      newVisible.add(name);
    }
    setVisibleItems(newVisible);
    onToggle(name, newVisible.has(name));
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => {
        const isVisible = visibleItems.has(item.name);
        return (
          <button
            key={item.name}
            onClick={() => handleToggle(item.name)}
            className={`interactive-legend-item ${!isVisible ? 'disabled' : ''}`}
          >
            <Badge
              variant="outline"
              className="flex items-center gap-2 px-3 py-1.5 text-sm border-2 transition-all duration-200"
              style={{
                borderColor: isVisible ? item.color : 'hsl(var(--border))',
                backgroundColor: isVisible ? `${item.color}15` : 'transparent',
                color: isVisible ? item.color : 'hsl(var(--muted-foreground))'
              }}
            >
              <div
                className="w-3 h-3 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: item.color,
                  opacity: isVisible ? 1 : 0.3
                }}
              />
              <span className="font-medium">{item.name}</span>
              {item.value !== undefined && (
                <span className="text-xs opacity-75">({item.value})</span>
              )}
              {isVisible ? (
                <Eye className="w-3 h-3 opacity-60" />
              ) : (
                <EyeOff className="w-3 h-3 opacity-60" />
              )}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}