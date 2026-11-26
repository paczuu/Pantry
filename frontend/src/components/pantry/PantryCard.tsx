import React, { useState } from 'react';
import { MoreVertical, Utensils, Trash2, ShoppingCart, Tag } from 'lucide-react';
import { PantryItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { ExpiryBadge } from '../common/ExpiryBadge';
import { PantryItemThumb } from '../common/PantryItemThumb';
import { QuantityStepper } from '../ui/QuantityStepper';
import { PantrySwipeRow } from './PantrySwipeRow';
import { api } from '../../services/api';
import { getExpiryStatus } from '../../utils/expiry';
import { cn } from '../../utils/cn';

interface PantryCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  viewMode?: 'grid' | 'list';
}

interface CardMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onShopping: () => void;
  onWasted: () => void;
  onDelete: () => void;
  labels: { shopping: string; wasted: string; remove: string };
  /** Classes of the "⋮" trigger button (in the grid it is a round button over the photo). */
  triggerClassName?: string;
  /** Width of the dropdown (narrower in the grid so it never leaves the screen). */
  menuWidthClassName?: string;
}

/** "⋮" button with a dropdown of secondary item actions. */
const CardMenu: React.FC<CardMenuProps> = ({
  open,
  onToggle,
  onClose,
  onShopping,
  onWasted,
  onDelete,
  labels,
  triggerClassName = 'w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors',
  menuWidthClassName = 'w-52',
}) => {
  const items = [
    { label: labels.shopping, icon: <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />, onClick: onShopping, danger: false },
    { label: labels.wasted, icon: <Trash2 className="w-3.5 h-3.5 shrink-0" />, onClick: onWasted, danger: true },
    { label: labels.remove, icon: <Trash2 className="w-3.5 h-3.5 shrink-0" />, onClick: onDelete, danger: true, separated: true },
  ];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={onToggle} className={triggerClassName} aria-label="Menu">
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* Transparent backdrop: a tap anywhere outside closes the menu */}
          <div className="fixed inset-0 z-20" onClick={onClose} />
          <div
            className={cn(
              'absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 text-xs animate-slide-up',
              menuWidthClassName
            )}
          >
            {items.map((entry) => (
              <React.Fragment key={entry.label}>
                {entry.separated && <div className="border-t border-slate-800 my-1" />}
                <button
                  onClick={entry.onClick}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 flex items-center gap-2 font-medium',
                    entry.danger
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : 'text-slate-200 hover:bg-slate-800'
                  )}
                >
                  {entry.icon} {entry.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** A pantry item rendered as a list row (swipe row on phones) or as a photo tile in the grid view. */
export const PantryCard: React.FC<PantryCardProps> = ({ item, onEdit, viewMode = 'list' }) => {
  const { consumeItem, deleteItem, refreshPantry, expiryWarningDays } = usePantry();
  const { showToast } = useToast();
  const { t, tCategory, language } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const en = language === 'en';

  const handleIncrement = async () => {
    setIsUpdating(true);
    try {
      await api.updatePantryItem(item.id, { quantity: item.quantity + 1 });
      await refreshPantry();
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async () => {
    if (item.quantity <= 1) {
      const msg = en
        ? `Are you sure you want to consume the last piece of "${item.name}"?`
        : `Czy na pewno chcesz zużyć ostatnią sztukę "${item.name}"?`;
      if (!window.confirm(msg)) return;
    }
    await consumeItem(item.id, 1, false);
  };

  const handleAddToShoppingList = async () => {
    try {
      const listsRes = await api.getShoppingLists();
      if (!listsRes.lists || listsRes.lists.length === 0) {
        showToast(t('shopping.emptyDesc'), 'warning');
        return;
      }
      const targetList = listsRes.lists[0];
      await api.addShoppingItem(targetList.id, {
        name: item.name,
        quantity: item.quantity || 1,
        capacity: item.capacity || undefined,
        category: item.category,
        barcode: item.barcode || undefined,
      });
      showToast(
        en
          ? `Added "${item.name}" to "${targetList.name}".`
          : `Dodano "${item.name}" do listy "${targetList.name}".`,
        'success'
      );
      setShowMenu(false);
    } catch {
      showToast(t('common.error'), 'error');
    }
  };

  const handleDelete = async () => {
    const msg = en
      ? `Are you sure you want to remove "${item.name}" from the pantry?`
      : `Czy na pewno chcesz całkowicie usunąć "${item.name}" ze spiżarni?`;
    if (window.confirm(msg)) {
      await deleteItem(item.id);
      setShowMenu(false);
    }
  };

  const handleWasted = async () => {
    const msg = en
      ? `Mark "${item.name}" as wasted/discarded?`
      : `Czy oznaczyć "${item.name}" jako zmarnowane/wyrzucone?`;
    if (window.confirm(msg)) {
      await consumeItem(item.id, item.quantity, true);
      setShowMenu(false);
    }
  };

  const status = getExpiryStatus(item.expiryDate, expiryWarningDays);

  const statusClasses =
    status === 'expired'
      ? 'bg-rose-950/20 border-rose-500/40'
      : status === 'warning'
      ? 'bg-amber-950/20 border-amber-500/40'
      : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800';

  const menuProps: CardMenuProps = {
    open: showMenu,
    onToggle: () => setShowMenu((v) => !v),
    onClose: () => setShowMenu(false),
    onShopping: handleAddToShoppingList,
    onWasted: handleWasted,
    onDelete: handleDelete,
    labels: {
      shopping: en ? 'Add to shopping list' : 'Dodaj do listy zakupów',
      wasted: en ? 'Mark as wasted' : 'Oznacz jako wyrzucone',
      remove: en ? 'Remove from pantry' : 'Usuń ze spiżarni',
    },
  };

  if (viewMode === 'list') {
    return (
      <>
        {/* Phones: compact row, actions are revealed by swiping left */}
        <PantrySwipeRow
          item={item}
          onEdit={onEdit}
          actions={{
            onConsume: handleDecrement,
            onShopping: handleAddToShoppingList,
            onWasted: handleWasted,
            onDelete: handleDelete,
          }}
          labels={{
            consume: en ? 'Consume' : 'Zużyj',
            shopping: en ? 'To list' : 'Do listy',
            wasted: en ? 'Wasted' : 'Wyrzuć',
            remove: en ? 'Delete' : 'Usuń',
          }}
        />

        {/* Tablet / desktop: single card row with stepper and menu */}
        <div
          onClick={() => onEdit(item)}
          className={cn(
            'relative hidden sm:flex items-center justify-between p-4 rounded-2xl transition-all gap-3 border cursor-pointer select-none',
            statusClasses
          )}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <PantryItemThumb item={item} />

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4
                  className="font-extrabold text-white text-base line-clamp-1 break-words leading-snug min-w-0"
                  title={item.name}
                >
                  {item.name}
                </h4>
                {item.brand && (
                  <span className="text-xs text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    {item.brand}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.capacity && (
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold whitespace-nowrap">
                    {item.capacity}
                  </span>
                )}
                <ExpiryBadge expiryDate={item.expiryDate} openedDate={item.openedDate} />
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                  <Tag className="w-3 h-3 text-slate-500" /> {tCategory(item.category)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <QuantityStepper
              quantity={item.quantity}
              unit={t('common.pcs')}
              decrementLabel={t('pantry.consumeOne')}
              onDecrement={handleDecrement}
              onIncrement={handleIncrement}
              incrementDisabled={isUpdating}
            />
            <CardMenu {...menuProps} />
          </div>
        </div>
      </>
    );
  }

  // Grid view: photo tile with an expiry pill shown only for items that need attention
  let statusPill: { text: string; cls: string } | null = null;
  if (item.expiryDate && (status === 'expired' || status === 'warning')) {
    if (status === 'expired') {
      statusPill = { text: t('dashboard.expired'), cls: 'bg-rose-500 text-white' };
    } else {
      const days = Math.round(
        (startOfDay(new Date(item.expiryDate)).getTime() - startOfDay(new Date()).getTime()) / 86400000
      );
      const text =
        days <= 0
          ? t('common.today')
          : days === 1
          ? t('common.tomorrow')
          : en
          ? `${days} d`
          : `${days} dni`;
      statusPill = { text, cls: 'bg-amber-400 text-slate-950' };
    }
  }

  return (
    <div
      onClick={() => onEdit(item)}
      className={cn(
        'relative flex flex-col h-full border rounded-2xl transition-colors cursor-pointer select-none',
        statusClasses,
        showMenu && 'z-40'
      )}
    >
      {/* Square photo spanning the whole tile */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl">
        <PantryItemThumb item={item} className="w-full h-full object-cover" />

        {statusPill && (
          <span
            className={cn(
              'absolute top-2 left-2 max-w-[70%] truncate px-2 py-0.5 rounded-full text-[11px] font-extrabold shadow-md',
              statusPill.cls
            )}
          >
            {statusPill.text}
          </span>
        )}

        {item.quantity > 1 && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/75 backdrop-blur-sm text-white text-[11px] font-bold">
            ×{item.quantity}
          </span>
        )}

        {/* Quick "consume one" button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDecrement();
          }}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg flex items-center justify-center active:scale-90 transition-all"
          title={t('pantry.consumeOne')}
          aria-label={t('pantry.consumeOne')}
        >
          <Utensils className="w-4 h-4" />
        </button>
      </div>

      {/* The menu sits outside the overflow-hidden photo so the dropdown is never clipped */}
      <div className="absolute top-1.5 right-1.5">
        <CardMenu
          {...menuProps}
          menuWidthClassName="w-44"
          triggerClassName="w-8 h-8 flex items-center justify-center rounded-full bg-slate-950/70 backdrop-blur-sm text-slate-100 hover:bg-slate-950 transition-colors"
        />
      </div>

      <div className="p-2.5 sm:p-3 flex-1">
        {item.brand && (
          <p className="text-[11px] font-semibold text-slate-400 truncate leading-tight">{item.brand}</p>
        )}
        <h4 className="font-extrabold text-white text-sm line-clamp-2 leading-snug mt-0.5" title={item.name}>
          {item.name}
        </h4>
      </div>
    </div>
  );
};
