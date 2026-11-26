import React from 'react';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  /** Icon element shown before the title (sized by the component). */
  icon: React.ReactElement<{ className?: string }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Buttons or toggles aligned to the right of the header. */
  actions?: React.ReactNode;
  /** Tailwind text color for the icon. */
  iconClassName?: string;
  className?: string;
}

/** Title block shared by every main screen: icon + title, optional subtitle and right-hand actions. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  subtitle,
  actions,
  iconClassName = 'text-emerald-400',
  className,
}) => (
  <div className={cn('flex items-center justify-between gap-3', className)}>
    <div className="min-w-0">
      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
        {React.cloneElement(icon, { className: cn('w-6 h-6 shrink-0', iconClassName) })}
        {title}
      </h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
