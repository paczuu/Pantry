import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Button } from './Button';
import { FieldLabel, Input, Textarea } from './FormControls';
import { focusAndKeepVisible } from '../../hooks/useVisualViewport';
import { useLanguage } from '../../language/LanguageContext';
import { cn } from '../../utils/cn';

/*
 * Building blocks of the full-height editor sheets (notes, recipes): a borderless title and body written
 * directly on the sheet, small icon buttons next to the title, a list editor and a footer with delete.
 */

interface SheetTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  autoFocus?: boolean;
}

/** Large title written directly on the sheet. */
export const SheetTitleInput: React.FC<SheetTitleInputProps> = ({ value, onChange, placeholder, ariaLabel, autoFocus }) => (
  <Input
    type="text"
    required
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    aria-label={ariaLabel}
    autoFocus={autoFocus}
    className="px-0 py-1 bg-transparent border-transparent rounded-none focus:border-transparent text-xl font-extrabold tracking-tight placeholder:font-bold"
  />
);

interface SheetTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
}

/** Text written directly on the sheet; fills the remaining height and scrolls inside itself. */
export const SheetTextArea: React.FC<SheetTextAreaProps> = ({ value, onChange, placeholder, ariaLabel }) => (
  <div className="relative flex-1 min-h-[30dvh]">
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="absolute inset-0 h-full px-0 py-1 bg-transparent border-transparent rounded-none focus:border-transparent font-sans leading-relaxed resize-none overflow-y-auto"
    />
  </div>
);

interface SheetIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Highlights the button (e.g. note pinned). */
  active?: boolean;
  /** Accessible name and tooltip (required: these buttons often have no text). */
  title: string;
}

/** Small square button shown next to the sheet title. */
export const SheetIconButton = React.forwardRef<HTMLButtonElement, SheetIconButtonProps>(
  ({ active, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={rest.title}
      className={cn(
        'w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center transition-colors',
        active
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
);
SheetIconButton.displayName = 'SheetIconButton';

interface SheetPopoverProps {
  /** Content of the trigger button (icon, current value). */
  trigger: React.ReactNode;
  title: string;
  active?: boolean;
  triggerClassName?: string;
  /** Panel content; call `close` to dismiss it after a choice. */
  children: (close: () => void) => React.ReactNode;
}

/** Icon button that opens a small panel below it; a tap outside closes it. */
export const SheetPopover: React.FC<SheetPopoverProps> = ({ trigger, title, active, triggerClassName, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <SheetIconButton
        title={title}
        active={active}
        aria-expanded={open}
        className={triggerClassName}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </SheetIconButton>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-max max-w-[calc(100vw-2rem)] p-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl animate-slide-up">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

interface SheetFooterProps {
  createdAt: string;
  updatedAt?: string;
  deleteLabel: string;
  onDelete: () => void;
}

/** Bottom line of an existing item's sheet: creation / edit date on the left, delete on the right. */
export const SheetFooter: React.FC<SheetFooterProps> = ({ createdAt, updatedAt, deleteLabel, onDelete }) => {
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'pl-PL';
  const edited = updatedAt && new Date(updatedAt).toDateString() !== new Date(createdAt).toDateString();

  return (
    <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
      <span className="text-[11px] text-slate-500 min-w-0">
        {t('notes.createdLabel')} {new Date(createdAt).toLocaleDateString(locale)}
        {edited && ` · ${t('notes.updatedLabel')} ${new Date(updatedAt).toLocaleDateString(locale)}`}
      </span>
      <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete}>
        {deleteLabel}
      </Button>
    </div>
  );
};

export interface SheetListItem {
  id: string;
  text: string;
  completed?: boolean;
}

interface SheetListEditorProps {
  items: SheetListItem[];
  onChange: (items: SheetListItem[]) => void;
  label: string;
  itemPlaceholder: string;
  newItemPlaceholder: string;
  addLabel: string;
  /** Show a tick box per item (checklist) instead of plain rows (ingredients). */
  checkable?: boolean;
  /** Checklist only: progress text and the label of the "remove completed" button. */
  progressText?: (done: number, total: number) => string;
  clearCompletedLabel?: string;
}

/** Editable list: inline-editable rows, optional ticks and progress, new item field below the list. */
export const SheetListEditor: React.FC<SheetListEditorProps> = ({
  items,
  onChange,
  label,
  itemPlaceholder,
  newItemPlaceholder,
  addLabel,
  checkable,
  progressText,
  clearCompletedLabel,
}) => {
  const { t } = useLanguage();
  const [newText, setNewText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const done = items.filter((item) => item.completed).length;

  const update = (id: string, patch: Partial<SheetListItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const add = () => {
    const text = newText.trim();
    if (!text) return;
    onChange([...items, { id: Math.random().toString(36).substring(2, 9), text, ...(checkable && { completed: false }) }]);
    setNewText('');
    window.setTimeout(() => focusAndKeepVisible(inputRef.current), 0);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel className="mb-0">{label}</FieldLabel>
        {checkable && progressText && items.length > 0 && (
          <span className="text-[11px] text-slate-300 font-semibold">{progressText(done, items.length)}</span>
        )}
      </div>

      {checkable && items.length > 0 && (
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-1.5 max-h-[40dvh] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              {checkable && (
                <button
                  type="button"
                  onClick={() => update(item.id, { completed: !item.completed })}
                  className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all',
                    item.completed
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border border-slate-600 bg-slate-900/60 hover:border-emerald-500/60'
                  )}
                  aria-pressed={!!item.completed}
                  aria-label={item.text}
                >
                  {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              )}

              <Input
                type="text"
                value={item.text}
                onChange={(e) => update(item.id, { text: e.target.value })}
                placeholder={itemPlaceholder}
                className={cn(
                  'flex-1 px-1 py-2 text-sm bg-transparent border-transparent rounded-none border-b-slate-800 focus:border-b-emerald-500',
                  item.completed && 'line-through text-slate-400'
                )}
              />

              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                className="text-slate-400 hover:text-rose-400 w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0"
                aria-label={t('common.delete')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New item goes below the list, like in a notebook */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          enterKeyHint="enter"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={newItemPlaceholder}
          className="flex-1 text-sm"
        />
        <Button variant="primary" icon={<Plus className="w-4 h-4 stroke-[2.5]" />} onClick={add}>
          {addLabel}
        </Button>
      </div>

      {checkable && done > 0 && clearCompletedLabel && (
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => onChange(items.filter((item) => !item.completed))}
        >
          {clearCompletedLabel}
        </Button>
      )}
    </div>
  );
};
