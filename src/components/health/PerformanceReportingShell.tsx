import * as React from 'react';
import { cn } from '@/lib/utils';
import { ReportingHeader } from './ReportingHeader';
import { ReportingSubnav } from './ReportingSubnav';

interface Props {
  eyebrow?: string;
  title: string;
  context?: string;
  updatedAt?: Date | null;
  sources?: { label: string; count: number }[];
  actions?: React.ReactNode;
  hideSubnav?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function PerformanceReportingShell({
  eyebrow,
  title,
  context,
  updatedAt,
  sources,
  actions,
  hideSubnav = false,
  className,
  children,
}: Props) {
  return (
    <div className={cn('font-health -m-6 min-h-[calc(100vh-64px)] bg-health-canvas p-6 text-health-ink sm:-m-6 sm:p-8', className)}>
      <div className="mx-auto max-w-[1400px] space-y-8">
        <ReportingHeader
          eyebrow={eyebrow}
          title={title}
          context={context}
          updatedAt={updatedAt}
          sources={sources}
          actions={actions}
        />
        {!hideSubnav && <ReportingSubnav />}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
