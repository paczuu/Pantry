import React, { useEffect, useRef, useState } from 'react';
import { Utensils, ShoppingCart, Trash2, PackageX } from 'lucide-react';
import { PantryItem } from '../../types';
import { PantryItemThumb } from '../common/PantryItemThumb';
import { ExpiryText } from '../common/ExpiryBadge';

export interface SwipeRowActions {
  onConsume: () => void;
  onShopping: () => void;
  onWasted: () => void;
  onDelete: () => void;
}

interface PantrySwipeRowProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  actions: SwipeRowActions;
  labels: { consume: string; shopping: string; wasted: string; remove: string };
}

const ACTION_WIDTH = 56;
const ACTION_COUNT = 4;
const OPEN_OFFSET = -(ACTION_WIDTH * ACTION_COUNT);
/** Minimum horizontal finger travel (px) before a gesture counts as swiping the row. */
const DRAG_START_THRESHOLD = 8;

/**
 * Compact pantry row for phones: photo, name, expiry status and a quantity chip.
 * The actions (consume, add to shopping list, wasted, delete) are revealed by swiping left.
 */
export const PantrySwipeRow: React.FC<PantrySwipeRowProps> = ({ item, onEdit, actions, labels }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const gesture = useRef({
    startX: 0,
    startY: 0,
    startOffset: 0,
    active: false,
    moved: false,
  });
  const offsetRef = useRef(0);

  const isOpen = offset <= OPEN_OFFSET / 2;

  const applyOffset = (value: number) => {
    offsetRef.current = value;
    setOffset(value);
  };

  const close = () => applyOffset(0);

  // A tap outside an open row closes it, so at most one row is open at a time
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: offsetRef.current,
      active: true,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.moved) {
      // Vertical page scrolling wins: only react to a clearly horizontal gesture
      if (Math.abs(dx) < DRAG_START_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      g.moved = true;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    applyOffset(Math.max(OPEN_OFFSET, Math.min(0, g.startOffset + dx)));
  };

  const finishGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;

    if (g.moved) {
      setIsDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      applyOffset(offsetRef.current < OPEN_OFFSET / 2 ? OPEN_OFFSET : 0);
    }
  };

  const handleClick = () => {
    // The browser still fires a `click` after a drag; it must not open the editor
    if (gesture.current.moved) {
      gesture.current.moved = false;
      return;
    }
    if (isOpen) {
      close();
      return;
    }
    onEdit(item);
  };

  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  const actionBtn =
    'h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium';

  return (
    <div
      ref={rowRef}
      className="sm:hidden relative overflow-hidden border-b border-slate-800/80 select-none"
    >
      {/* Actions revealed by the swipe */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: -OPEN_OFFSET }}>
        <button
          type="button"
          onClick={run(actions.onConsume)}
          className={`${actionBtn} bg-emerald-800 text-emerald-100`}
          style={{ width: ACTION_WIDTH }}
        >
          <Utensils className="w-4 h-4" />
          {labels.consume}
        </button>
        <button
          type="button"
          onClick={run(actions.onShopping)}
          className={`${actionBtn} bg-cyan-800 text-cyan-100`}
          style={{ width: ACTION_WIDTH }}
        >
          <ShoppingCart className="w-4 h-4" />
          {labels.shopping}
        </button>
        <button
          type="button"
          onClick={run(actions.onWasted)}
          className={`${actionBtn} bg-amber-800 text-amber-100`}
          style={{ width: ACTION_WIDTH }}
        >
          <PackageX className="w-4 h-4" />
          {labels.wasted}
        </button>
        <button
          type="button"
          onClick={run(actions.onDelete)}
          className={`${actionBtn} bg-rose-800 text-rose-100`}
          style={{ width: ACTION_WIDTH }}
        >
          <Trash2 className="w-4 h-4" />
          {labels.remove}
        </button>
      </div>

      {/* Row content */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onClick={handleClick}
        className={`relative flex items-center gap-3 py-2 px-0.5 bg-slate-950 cursor-pointer touch-pan-y ${
          isDragging ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <PantryItemThumb item={item} className="!w-10 !h-10" />

        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-white truncate" title={item.name}>
            {item.name}
          </div>
          <div className="text-xs text-slate-400 truncate">
            <ExpiryText expiryDate={item.expiryDate} openedDate={item.openedDate} />
            {item.capacity && (
              <span>
                {item.expiryDate || item.openedDate ? ' · ' : ''}
                {item.capacity}
              </span>
            )}
          </div>
        </div>

        <span className="shrink-0 bg-slate-800 rounded-lg px-2 py-1 text-xs font-medium text-slate-200 whitespace-nowrap">
          ×{item.quantity}
        </span>
      </div>
    </div>
  );
};
