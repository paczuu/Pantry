import React from 'react';
import { cn } from '../../utils/cn';

/** Rounded container used for grouped content (lists, forms, summaries). */
export const Panel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('rounded-3xl bg-slate-900/80 border border-slate-800', className)} {...rest} />
);

interface EmptyStateProps {
  /** Optional icon shown above the title. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons rendered below the text. */
  actions?: React.ReactNode;
  className?: string;
}

/** Placeholder shown when a list or search has no results. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actions, className }) => (
  <div
    className={cn(
      'py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-6 space-y-3',
      className
    )}
  >
    {icon}
    <div className="space-y-1">
      <h3 className="text-base font-bold text-white">{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-sm mx-auto">{description}</p>}
    </div>
    {actions && <div className="flex items-center justify-center gap-3 pt-2">{actions}</div>}
  </div>
);
