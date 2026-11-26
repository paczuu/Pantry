import React from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-bold whitespace-nowrap transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/40',
  secondary: 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200',
  ghost: 'text-slate-400 hover:text-white hover:bg-slate-800',
  danger: 'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 rounded-xl text-xs',
  md: 'px-4 py-2.5 rounded-xl text-xs',
  lg: 'px-4 py-3 rounded-xl text-sm',
  icon: 'w-9 h-9 rounded-lg',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretches the button to the full width of its container. */
  fullWidth?: boolean;
  /** Leading icon rendered before the label. */
  icon?: React.ReactNode;
  /** Hides the text label on phones so only the icon is shown (the label stays as aria-label). */
  collapseLabel?: boolean;
}

/**
 * The single button used across the app. Pick a `variant` for the look and a `size` for the
 * dimensions; anything else (layout, one-off tweaks) can be passed through `className`.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'secondary', size = 'md', fullWidth, icon, collapseLabel, className, children, type = 'button', ...rest },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {icon}
      {collapseLabel ? <span className="hidden sm:inline">{children}</span> : children}
    </button>
  )
);
Button.displayName = 'Button';
