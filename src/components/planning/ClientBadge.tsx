import { Client } from '@/lib/planning/types';
import { cn } from '@/lib/utils';

interface ClientBadgeProps {
  client: Client;
  size?: 'sm' | 'md';
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function ClientBadge({ client, size = 'md', compact = false, className, onClick }: ClientBadgeProps) {
  const isClickable = !!onClick;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        size === 'sm' && "text-sm",
        compact && "gap-1.5",
        isClickable && "cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
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
        compact && "text-xs max-w-[120px]"
      )}>
        {client.name}
      </span>
    </div>
  );
}
