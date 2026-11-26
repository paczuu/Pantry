import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface QuantityStepperProps {
  quantity: number;
  /** Unit label shown next to the number (e.g. "pcs"). */
  unit?: string;
  /** Show the unit on every screen size instead of hiding it on phones. */
  alwaysShowUnit?: boolean;
  decrementLabel?: string;
  incrementLabel?: string;
  onDecrement: (e: React.MouseEvent) => void;
  onIncrement: (e: React.MouseEvent) => void;
  incrementDisabled?: boolean;
  className?: string;
}

/** "−  3 pcs  +" control used wherever a quantity can be adjusted by one. */
export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  quantity,
  unit,
  alwaysShowUnit,
  decrementLabel = '-1',
  incrementLabel = '+1',
  onDecrement,
  onIncrement,
  incrementDisabled,
  className,
}) => (
  <div
    className={cn(
      'flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner',
      className
    )}
  >
    <button
      type="button"
      onClick={onDecrement}
      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
      title={decrementLabel}
      aria-label={decrementLabel}
    >
      <Minus className="w-4 h-4" />
    </button>
    <span className="px-1.5 sm:px-2.5 text-xs sm:text-sm font-extrabold text-white min-w-[2.8rem] text-center whitespace-nowrap">
      {quantity}{' '}
      {unit && (
        <span className={cn('text-[11px] text-slate-400 font-normal', !alwaysShowUnit && 'hidden sm:inline')}>
          {unit}
        </span>
      )}
    </span>
    <button
      type="button"
      onClick={onIncrement}
      disabled={incrementDisabled}
      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 active:scale-95"
      title={incrementLabel}
      aria-label={incrementLabel}
    >
      <Plus className="w-4 h-4" />
    </button>
  </div>
);
