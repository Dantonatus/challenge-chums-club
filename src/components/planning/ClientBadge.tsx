import { Client } from '@/lib/planning/types';
import { cn } from '@/lib/utils';

interface ClientBadgeProps {
  client: Client;
  size?: 'sm' | 'md';
  compact?: boolean;
  className?: string;
}

export function ClientBadge({ client, size = 'md', compact = false, className }: ClientBadgeProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        size === 'sm' && "text-sm",
        compact && "gap-1.5",
        className
      )}
    >
      <div 
        className={cn(
          "rounded-full shrink-0",
          size === 'sm' || compact ? "w-2 h-2" : "w-3 h-3"
        )}
        style={{ backgroundColor: client.color }}
      />
      <span className={cn(
        "font-medium truncate",
        size === 'sm' && "text-xs",
        compact && "text-xs max-w-[100px]"
      )}>
        {client.name}
      </span>
    </div>
  );
}
