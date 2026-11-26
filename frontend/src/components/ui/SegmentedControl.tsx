import React from 'react';
import { cn } from '../../utils/cn';

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Overrides the highlight classes of this option when it is selected. */
  activeClassName?: string;
  /** Tooltip / accessible name, needed for icon-only options. */
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `fill` stretches the options evenly across the full width. */
  fill?: boolean;
  /** `icon` is for icon-only options, `sm` for dense toolbars. */
  size?: 'md' | 'sm' | 'icon';
  className?: string;
}

const ACTIVE_DEFAULT = 'bg-emerald-500 text-slate-950 shadow-md';
const OPTION_SIZE = {
  md: 'gap-2 px-3 py-2.5',
  sm: 'gap-1.5 px-2.5 py-1.5',
  icon: 'p-2.5',
};

/** Pill-style switch between a few mutually exclusive options (tabs, view toggles). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fill,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold',
        fill ? 'grid' : 'inline-flex items-center',
        className
      )}
      style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          title={option.title}
          aria-label={option.title}
          className={cn(
            'flex items-center justify-center rounded-lg transition-all',
            OPTION_SIZE[size],
            value === option.value
              ? option.activeClassName ?? ACTIVE_DEFAULT
              : 'text-slate-400 hover:text-white'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
