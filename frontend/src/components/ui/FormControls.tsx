import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

const CONTROL =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50';

/** Text-like `<input>` with the app's standard field styling. */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cn(CONTROL, className)} {...rest} />
);
Input.displayName = 'Input';

/** `<select>` with the same styling as {@link Input}. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...rest }, ref) => <select ref={ref} className={cn(CONTROL, 'cursor-pointer', className)} {...rest} />
);
Select.displayName = 'Select';

/** `<textarea>` with the same styling as {@link Input}. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} className={cn(CONTROL, className)} {...rest} />
);
Textarea.displayName = 'Textarea';

/** Small caption above a form control; pass an icon to show it before the text. */
export const FieldLabel: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  htmlFor?: string;
}> = ({ children, icon, className, htmlFor }) => (
  <label
    htmlFor={htmlFor}
    className={cn('block text-xs font-semibold text-slate-300 mb-1', icon && 'flex items-center gap-1', className)}
  >
    {icon}
    {children}
  </label>
);

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Controls rendered inside the field on the right (clear / scan buttons). */
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

/** Search field with a leading magnifier icon and optional trailing controls. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, trailing, ...rest }, ref) => (
    <div className={cn('relative', wrapperClassName)}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <Input
        ref={ref}
        type="text"
        className={cn(
          'pl-10 pr-4 rounded-2xl bg-slate-900 border-slate-800 text-xs sm:text-sm placeholder-slate-500 transition-colors',
          className
        )}
        {...rest}
      />
      {trailing && <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">{trailing}</div>}
    </div>
  )
);
SearchInput.displayName = 'SearchInput';
