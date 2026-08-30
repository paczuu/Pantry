import React, { useState } from 'react';
import { PantryItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { ExpiryBadge } from '../common/ExpiryBadge';
import { api } from '../../services/api';
import {
  Minus,
  Plus,
  MoreVertical,
  Edit2,
  Utensils,
  Trash2,
  ShoppingCart,
  Tag,
  Package,
  AlertTriangle,
} from 'lucide-react';

interface PantryCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  viewMode?: 'grid' | 'list';
}

export const PantryCard: React.FC<PantryCardProps> = ({
  item,
  onEdit,
  viewMode = 'grid',
}) => {
  const { consumeItem, deleteItem, refreshPantry, expiryWarningDays } = usePantry();
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleIncrement = async () => {
    setIsUpdating(true);
    try {
      await api.updatePantryItem(item.id, { quantity: item.quantity + 1 });
      await refreshPantry();
    } catch (e: any) {
      showToast('Błąd aktualizacji ilości.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async () => {
    if (item.quantity <= 1) {
      if (window.confirm(`Czy na pewno chcesz zużyć ostatnią sztukę "${item.name}"?`)) {
        await consumeItem(item.id, 1, false);
      }
    } else {
      await consumeItem(item.id, 1, false);
    }
  };

  const handleAddToShoppingList = async () => {
    try {
      const listsRes = await api.getShoppingLists();
      if (!listsRes.lists || listsRes.lists.length === 0) {
        showToast('Najpierw utwórz listę zakupów.', 'warning');
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
      showToast(`Dodano "${item.name}" do listy "${targetList.name}".`, 'success');
      setShowMenu(false);
    } catch (e: any) {
      showToast('Błąd dodawania do listy zakupów.', 'error');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Czy na pewno chcesz całkowicie usunąć "${item.name}" ze spiżarni?`)) {
      await deleteItem(item.id);
      setShowMenu(false);
    }
  };

  const handleWasted = async () => {
    if (window.confirm(`Czy oznaczyć "${item.name}" jako zmarnowane/wyrzucone?`)) {
      await consumeItem(item.id, item.quantity, true);
      setShowMenu(false);
    }
  };

  // Oblicz stan ostrzeżenia o terminie
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let isExpiringWarning = false;
  let isExpired = false;

  if (item.expiryDate) {
    const exp = new Date(item.expiryDate);
    const warningUntil = new Date(today);
    warningUntil.setDate(warningUntil.getDate() + expiryWarningDays);
    if (exp < today) {
      isExpired = true;
    } else if (exp <= warningUntil) {
      isExpiringWarning = true;
    }
  }

  // WIDOK LISTY
  if (viewMode === 'list') {
    return (
      <div
        className={`relative flex items-center justify-between p-3 sm:p-4 rounded-2xl transition-all gap-3 border ${
          isExpired
            ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/20'
            : isExpiringWarning
            ? 'bg-amber-950/20 border-amber-500/40 shadow-amber-950/20'
            : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800'
        }`}
      >
        {/* Lewa strona: Zdjęcie + Informacje */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Zdjęcie */}
          <div className="relative shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-14 h-14 object-contain rounded-xl bg-slate-950 border border-slate-800 p-1 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-400 shrink-0">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
            )}
            {(isExpired || isExpiringWarning) && (
              <div
                className={`absolute -top-1 -right-1 p-0.5 rounded-full ${
                  isExpired ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                }`}
                title={isExpired ? 'Produkt przeterminowany!' : 'Krótki termin ważności!'}
              >
                <AlertTriangle className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Dane: Nazwa, Producent, Pojemność, Kategoria, Data ważności */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-white text-sm sm:text-base truncate leading-snug">
                {item.name}
              </h4>
              {item.brand && (
                <span className="text-xs text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  {item.brand}
                </span>
              )}
              {item.capacity && (
                <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                  {item.capacity}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                <Tag className="w-3 h-3 text-slate-500" /> {item.category}
              </span>
              <ExpiryBadge expiryDate={item.expiryDate} openedDate={item.openedDate} />
            </div>
          </div>
        </div>

        {/* Prawa strona: Szybka edycja ilości (sztuki) + Menu opcji */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Stepper ilości */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner">
            <button
              onClick={handleDecrement}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
              title="Zmniejsz / Zużyj 1 szt."
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 text-xs sm:text-sm font-extrabold text-white min-w-[2.8rem] text-center">
              {item.quantity} <span className="text-[10px] text-slate-400 font-normal">szt.</span>
            </span>
            <button
              onClick={handleIncrement}
              disabled={isUpdating}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 active:scale-95"
              title="Zwiększ o 1 szt."
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menu dodatkowych opcji */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 text-xs animate-slide-up">
                  <button
                    onClick={() => { onEdit(item); setShowMenu(false); }}
                    className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> Edytuj produkt
                  </button>
                  <button
                    onClick={handleAddToShoppingList}
                    className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" /> Dodaj do listy zakupów
                  </button>
                  <button
                    onClick={handleWasted}
                    className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Oznacz jako wyrzucone
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Usuń ze spiżarni
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // WIDOK SIATKI (GRID)
  return (
    <div
      className={`relative group border rounded-2xl p-4 transition-all shadow-lg flex flex-col justify-between ${
        isExpired
          ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/20'
          : isExpiringWarning
          ? 'bg-amber-950/20 border-amber-500/40 shadow-amber-950/20'
          : 'bg-slate-900/85 hover:bg-slate-900 border-slate-800 hover:border-slate-700/80 shadow-slate-950/40'
      }`}
    >
      {/* Góra karty */}
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div className="relative shrink-0">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-14 h-14 object-contain rounded-xl bg-slate-950 border border-slate-800 p-1"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400">
              <Package className="w-7 h-7 text-emerald-400" />
            </div>
          )}
          {(isExpired || isExpiringWarning) && (
            <div
              className={`absolute -top-1 -right-1 p-0.5 rounded-full ${
                isExpired ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.capacity && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                {item.capacity}
              </span>
            )}
            {item.brand && (
              <span className="text-[11px] text-slate-300 font-semibold truncate max-w-[120px]">
                {item.brand}
              </span>
            )}
          </div>
          <h4 className="font-extrabold text-white text-sm line-clamp-2 leading-snug mt-0.5" title={item.name}>
            {item.name}
          </h4>
        </div>

        {/* Menu rozwijane */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1 z-30 text-xs animate-slide-up">
                <button
                  onClick={() => { onEdit(item); setShowMenu(false); }}
                  className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> Edytuj
                </button>
                <button
                  onClick={handleAddToShoppingList}
                  className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" /> Dodaj do listy zakupów
                </button>
                <button
                  onClick={handleWasted}
                  className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Oznacz jako wyrzucone
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Usuń ze spiżarni
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Środek: Kategoria i Data ważności */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Tag className="w-3 h-3 text-slate-500" />
          <span className="truncate">{item.category}</span>
        </div>
        <ExpiryBadge expiryDate={item.expiryDate} openedDate={item.openedDate} />
      </div>

      {/* Dół: Licznik ilości w sztukach i szybkie zużycie */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner">
          <button
            onClick={handleDecrement}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
            title="Zmniejsz / Zużyj 1 szt."
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="px-3 text-sm font-extrabold text-white min-w-[3rem] text-center">
            {item.quantity} <span className="text-[10px] text-slate-400 font-normal">szt.</span>
          </span>
          <button
            onClick={handleIncrement}
            disabled={isUpdating}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
            title="Zwiększ o 1 szt."
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => consumeItem(item.id, 1, false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all active:scale-95"
          title="Szybkie zużycie 1 sztuki"
        >
          <Utensils className="w-3.5 h-3.5" />
          Zużyj
        </button>
      </div>
    </div>
  );
};
