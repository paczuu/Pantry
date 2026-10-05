import React, { useState } from 'react';
import { PantryItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { ExpiryBadge } from '../common/ExpiryBadge';
import { PantryItemThumb } from '../common/PantryItemThumb';
import { api } from '../../services/api';
import { getExpiryStatus } from '../../utils/expiry';
import {
  Minus,
  Plus,
  MoreVertical,
  Utensils,
  Trash2,
  ShoppingCart,
  Tag,
  Package,
} from 'lucide-react';

interface PantryCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  viewMode?: 'grid' | 'list';
}

/* ---------- Małe, współdzielone elementy ---------- */

interface StepperProps {
  quantity: number;
  pcs: string;
  decTitle: string;
  disabled: boolean;
  onDec: (e: React.MouseEvent) => void;
  onInc: (e: React.MouseEvent) => void;
}

const Stepper: React.FC<StepperProps> = ({ quantity, pcs, decTitle, disabled, onDec, onInc }) => (
  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner">
    <button
      onClick={onDec}
      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
      title={decTitle}
    >
      <Minus className="w-3.5 h-3.5" />
    </button>
    <span className="px-2.5 text-xs sm:text-sm font-extrabold text-white min-w-[2.8rem] text-center">
      {quantity} <span className="text-[10px] text-slate-400 font-normal">{pcs}</span>
    </span>
    <button
      onClick={onInc}
      disabled={disabled}
      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 active:scale-95"
      title="+1"
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  </div>
);

interface MenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onShopping: (e: React.MouseEvent) => void;
  onWasted: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  labels: { shopping: string; wasted: string; remove: string };
  /** Styl przycisku „⋮” (w siatce — okrągły, na zdjęciu) */
  triggerClassName?: string;
  /** Szerokość rozwijanego menu (w siatce węższa, żeby nie wychodziła poza ekran) */
  menuWidthClassName?: string;
}

const CardMenu: React.FC<MenuProps> = ({
  open,
  onToggle,
  onClose,
  onShopping,
  onWasted,
  onDelete,
  labels,
  triggerClassName = 'p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors',
  menuWidthClassName = 'w-52',
}) => (
  <div className="relative" onClick={(e) => e.stopPropagation()}>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={triggerClassName}
      aria-label="Menu"
    >
      <MoreVertical className="w-4 h-4" />
    </button>

    {open && (
      <>
        <div
          className="fixed inset-0 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
        <div
          className={`absolute right-0 top-full mt-1 ${menuWidthClassName} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 text-xs animate-slide-up`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onShopping}
            className="w-full text-left px-3.5 py-2.5 text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {labels.shopping}
          </button>
          <button
            onClick={onWasted}
            className="w-full text-left px-3.5 py-2.5 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" /> {labels.wasted}
          </button>
          <div className="border-t border-slate-800 my-1" />
          <button
            onClick={onDelete}
            className="w-full text-left px-3.5 py-2.5 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" /> {labels.remove}
          </button>
        </div>
      </>
    )}
  </div>
);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* ---------- Karta ---------- */

export const PantryCard: React.FC<PantryCardProps> = ({
  item,
  onEdit,
  viewMode = 'list',
}) => {
  const { consumeItem, deleteItem, refreshPantry, expiryWarningDays } = usePantry();
  const { showToast } = useToast();
  const { t, tCategory, language } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const en = language === 'en';

  const handleIncrement = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleDecrement = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.quantity <= 1) {
      const msg = en
        ? `Are you sure you want to consume the last piece of "${item.name}"?`
        : `Czy na pewno chcesz zużyć ostatnią sztukę "${item.name}"?`;
      if (window.confirm(msg)) {
        await consumeItem(item.id, 1, false);
      }
    } else {
      await consumeItem(item.id, 1, false);
    }
  };

  const handleAddToShoppingList = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const msg = en
      ? `Are you sure you want to remove "${item.name}" from the pantry?`
      : `Czy na pewno chcesz całkowicie usunąć "${item.name}" ze spiżarni?`;
    if (window.confirm(msg)) {
      await deleteItem(item.id);
      setShowMenu(false);
    }
  };

  const handleWasted = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const menuLabels = {
    shopping: en ? 'Add to shopping list' : 'Dodaj do listy zakupów',
    wasted: en ? 'Mark as wasted' : 'Oznacz jako wyrzucone',
    remove: en ? 'Remove from pantry' : 'Usuń ze spiżarni',
  };

  const menuProps: MenuProps = {
    open: showMenu,
    onToggle: () => setShowMenu((v) => !v),
    onClose: () => setShowMenu(false),
    onShopping: handleAddToShoppingList,
    onWasted: handleWasted,
    onDelete: handleDelete,
    labels: menuLabels,
  };

  /* WIDOK LISTY — kompaktowy: zdjęcie, nazwa, termin, ilość */
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onEdit(item)}
        className={`relative flex items-center justify-between p-3 sm:p-4 rounded-2xl transition-all gap-3 border cursor-pointer select-none ${statusClasses}`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <PantryItemThumb item={item} />

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-white text-sm sm:text-base truncate leading-snug">
                {item.name}
              </h4>
              {item.capacity && (
                <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                  {item.capacity}
                </span>
              )}
              {item.brand && (
                <span className="hidden sm:inline text-xs text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  {item.brand}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ExpiryBadge expiryDate={item.expiryDate} openedDate={item.openedDate} />
              {/* Kategoria tylko od szerszych ekranów — na telefonie zajmuje miejsce */}
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                <Tag className="w-3 h-3 text-slate-500" /> {tCategory(item.category)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-1 sm:gap-3 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Stepper
            quantity={item.quantity}
            pcs={t('common.pcs')}
            decTitle={t('pantry.consumeOne')}
            disabled={isUpdating}
            onDec={handleDecrement}
            onInc={handleIncrement}
          />
          <CardMenu {...menuProps} />
        </div>
      </div>
    );
  }

  /* WIDOK SIATKI — kafelek zdjęciowy: zdjęcie, marka, nazwa */
  let statusPill: { text: string; cls: string } | null = null;
  if (item.expiryDate && (status === 'expired' || status === 'warning')) {
    const days = Math.round(
      (startOfDay(new Date(item.expiryDate)).getTime() - startOfDay(new Date()).getTime()) / 86400000
    );
    if (status === 'expired') {
      statusPill = { text: t('dashboard.expired'), cls: 'bg-rose-500 text-white' };
    } else {
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
      className={`relative flex flex-col h-full border rounded-2xl transition-colors cursor-pointer select-none ${statusClasses} ${
        showMenu ? 'z-40' : ''
      }`}
    >
      {/* Zdjęcie: kwadrat na całą szerokość kafelka */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl">
        <PantryItemThumb item={item} className="w-full h-full object-cover" />

        {/* Status terminu — tylko gdy wymaga uwagi */}
        {statusPill && (
          <span
            className={`absolute top-2 left-2 max-w-[70%] truncate px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-md ${statusPill.cls}`}
          >
            {statusPill.text}
          </span>
        )}

        {/* Ilość (tylko gdy więcej niż 1) */}
        {item.quantity > 1 && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/75 backdrop-blur-sm text-white text-[11px] font-bold">
            ×{item.quantity}
          </span>
        )}

        {/* Szybkie zużycie */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDecrement(e);
          }}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg flex items-center justify-center active:scale-90 transition-all"
          title={t('pantry.consumeOne')}
          aria-label={t('pantry.consumeOne')}
        >
          <Utensils className="w-4 h-4" />
        </button>
      </div>

      {/* Menu „⋮” poza kontenerem z overflow, żeby rozwijane menu nie było ucinane */}
      <div className="absolute top-1.5 right-1.5">
        <CardMenu
          {...menuProps}
          menuWidthClassName="w-44"
          triggerClassName="w-8 h-8 flex items-center justify-center rounded-full bg-slate-950/70 backdrop-blur-sm text-slate-100 hover:bg-slate-950 transition-colors"
        />
      </div>

      {/* Marka + nazwa */}
      <div className="p-2.5 sm:p-3 flex-1">
        {item.brand && (
          <p className="text-[11px] font-semibold text-slate-400 truncate leading-tight">{item.brand}</p>
        )}
        <h4
          className="font-extrabold text-white text-sm line-clamp-2 leading-snug mt-0.5"
          title={item.name}
        >
          {item.name}
        </h4>
      </div>
    </div>
  );
};