import React, { useState, useEffect } from 'react';
import { ShoppingList, ShoppingItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { Modal } from '../common/Modal';
import { LiveEditorsBadge } from '../common/LiveEditorsBadge';
import { useLiveRefresh } from '../../contexts/RealtimeContext';
import {
  Plus,
  Trash2,
  ShoppingBag,
  Minus,
  Check,
  ListPlus,
  Scale,
} from 'lucide-react';

export const ShoppingListsView: React.FC = () => {
  const { showToast, playBeep } = useToast();
  const { t, language } = useLanguage();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Form states for adding items
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCapacity, setNewItemCapacity] = useState('');
  const [showCapInput, setShowCapInput] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState('Other');

  // Modals
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const fetchLists = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.getShoppingLists();
      setLists(data.lists || []);
      if (data.lists && data.lists.length > 0 && !activeListId) {
        setActiveListId(data.lists[0].id);
      }
    } catch (e: any) {
      console.error('Błąd pobierania list zakupów:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useLiveRefresh('spizarnia_shopping_refresh', () => fetchLists(true));

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await api.createShoppingList({ name: newListName.trim() });
      showToast(
        language === 'en'
          ? `Created list "${res.list.name}"`
          : `Utworzono listę "${res.list.name}"`,
        'success'
      );
      setNewListName('');
      setIsNewListModalOpen(false);
      await fetchLists();
      setActiveListId(res.list.id);
    } catch (err: any) {
      showToast(
        language === 'en' ? 'Error creating list.' : 'Błąd tworzenia listy.',
        'error'
      );
    }
  };

  const handleDeleteList = async (id: string, name: string) => {
    if (
      window.confirm(
        language === 'en'
          ? `Are you sure you want to delete the shopping list "${name}"?`
          : `Czy na pewno chcesz usunąć całą listę "${name}"?`
      )
    ) {
      try {
        await api.deleteShoppingList(id);
        showToast(
          language === 'en' ? 'Shopping list deleted.' : 'Lista została usunięta.',
          'info'
        );
        const remaining = lists.filter((l) => l.id !== id);
        setLists(remaining);
        if (remaining.length > 0) setActiveListId(remaining[0].id);
      } catch (err: any) {
        showToast(
          language === 'en' ? 'Error deleting list.' : 'Błąd usuwania listy.',
          'error'
        );
      }
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !activeList) return;

    try {
      const res = await api.addShoppingItem(activeList.id, {
        name: newItemName.trim(),
        quantity: Math.max(1, newItemQty),
        capacity: newItemCapacity.trim() || undefined,
        category: newItemCategory,
      });

      setLists((prev) =>
        prev.map((l) =>
          l.id === activeList.id ? { ...l, items: [...l.items, res.item] } : l
        )
      );

      setNewItemName('');
      setNewItemQty(1);
      setNewItemCapacity('');
      setShowCapInput(false);
      playBeep(750, 'sine', 0.08);
    } catch (err: any) {
      showToast(
        language === 'en' ? 'Error adding item.' : 'Błąd dodawania pozycji.',
        'error'
      );
    }
  };

  const handleToggleItem = async (item: ShoppingItem) => {
    const newChecked = !item.isChecked;
    setLists((prev) =>
      prev.map((l) =>
        l.id === activeList.id
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === item.id ? { ...i, isChecked: newChecked } : i
              ),
            }
          : l
      )
    );

    if (newChecked) {
      playBeep(880, 'sine', 0.1);
    }

    try {
      await api.updateShoppingItem(item.id, { isChecked: newChecked });
    } catch (e: any) {
      fetchLists();
    }
  };

  const handleUpdateItemQty = async (item: ShoppingItem, newQty: number) => {
    if (newQty <= 0) {
      handleDeleteItem(item.id);
      return;
    }

    setLists((prev) =>
      prev.map((l) =>
        l.id === activeList.id
          ? {
              ...l,
              items: l.items.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)),
            }
          : l
      )
    );

    try {
      await api.updateShoppingItem(item.id, { quantity: newQty });
    } catch (e: any) {
      fetchLists();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === activeList.id
          ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
          : l
      )
    );

    try {
      await api.deleteShoppingItem(itemId);
    } catch (e: any) {
      fetchLists();
    }
  };

  const handleClearChecked = async () => {
    if (!activeList) return;
    try {
      await api.clearCheckedItems(activeList.id);
      showToast(
        language === 'en'
          ? 'Cleared bought items.'
          : 'Wyczyszczono kupione artykuły.',
        'info'
      );
      await fetchLists();
    } catch (e: any) {
      showToast(
        language === 'en' ? 'Error clearing list.' : 'Błąd czyszczenia listy.',
        'error'
      );
    }
  };

  const checkedCount = activeList?.items.filter((i) => i.isChecked).length || 0;
  const totalCount = activeList?.items.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Nagłówek i Zakładki List */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-400" />
            {t('shopping.title')}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'en'
              ? 'Plan groceries and check off bought items'
              : 'Planuj zakupy i oznaczaj kupione produkty'}
          </p>
        </div>

        <button
          onClick={() => setIsNewListModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all self-start sm:self-auto"
        >
          <ListPlus className="w-4 h-4" />
          {t('shopping.createList')}
        </button>
      </div>

      {/* Zakładki List Zakupów */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {lists.map((l) => {
          const isSelected = l.id === activeListId;
          const checked = l.items.filter((i) => i.isChecked).length;
          return (
            <button
              key={l.id}
              onClick={() => setActiveListId(l.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 border transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <span>{l.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {checked}/{l.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Główny Panel Aktywnej Listy */}
      {activeList ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
          {/* Pasek Tytułowy Listy i Akcje Zbiorcze */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {activeList.name}
              </h3>
              <div className="text-xs text-slate-400">
                {checkedCount === totalCount && totalCount > 0
                  ? (language === 'en' ? '🎉 All items bought!' : '🎉 Wszystkie artykuły kupione!')
                  : (language === 'en'
                    ? `Bought: ${checkedCount} of ${totalCount} items`
                    : `Kupiono: ${checkedCount} z ${totalCount} artykułów`)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {checkedCount > 0 && (
                <button
                  onClick={handleClearChecked}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                >
                  {t('shopping.clearChecked')}
                </button>
              )}

              {lists.length > 1 && (
                <button
                  onClick={() => handleDeleteList(activeList.id, activeList.name)}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
                  title={language === 'en' ? 'Delete list' : 'Usuń listę'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Formularz Szybkiego Dodawania Artykułu */}
          <form onSubmit={handleAddItem} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t('shopping.addItemPlaceholder')}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />

              {/* Ilość w sztukach */}
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-2xl p-0.5">
                <input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center bg-transparent text-white text-sm font-bold focus:outline-none"
                />
                <span className="text-xs text-slate-400 pr-2 font-medium">{t('common.pcs')}</span>
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Opcjonalna pojemność */}
            <div>
              {!showCapInput && !newItemCapacity ? (
                <button
                  type="button"
                  onClick={() => setShowCapInput(true)}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 font-medium flex items-center gap-1"
                >
                  <Scale className="w-3 h-3" />
                  {language === 'en'
                    ? '+ Add net weight / volume (e.g. 500g, 1L)'
                    : '+ Dodaj gramaturę / pojemność (np. 500g, 1L)'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newItemCapacity}
                    onChange={(e) => setNewItemCapacity(e.target.value)}
                    placeholder={language === 'en' ? 'Net weight / volume (e.g. 500g, 1L)' : 'Pojemność / waga (np. 500g, 1L)'}
                    className="w-56 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => { setNewItemCapacity(''); setShowCapInput(false); }}
                    className="text-xs text-slate-500 hover:text-rose-400"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Lista Artykułów */}
          <div className="space-y-2">
            {activeList.items.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                {language === 'en'
                  ? 'List is empty. Type a product name above to add items.'
                  : 'Lista jest pusta. Wpisz produkt powyżej, aby dodać.'}
              </div>
            ) : (
              activeList.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    item.isChecked
                      ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60'
                  }`}
                >
                  {/* Checkbox i Nazwa */}
                  <div
                    onClick={() => handleToggleItem(item)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                  >
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        item.isChecked
                          ? 'bg-emerald-500 text-slate-950'
                          : 'border-2 border-slate-600 text-transparent hover:border-emerald-400'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold truncate ${
                          item.isChecked ? 'line-through text-slate-400' : 'text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.capacity && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono font-bold">
                          {item.capacity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ilość i Usuń */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => handleUpdateItemQty(item, item.quantity - 1)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-200 min-w-[2.2rem] text-center">
                        {item.quantity} <span className="text-[10px] text-slate-400 font-normal">{t('common.pcs')}</span>
                      </span>
                      <button
                        onClick={() => handleUpdateItemQty(item, item.quantity + 1)}
                        className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400">{t('common.loading')}</div>
      )}

      {/* Modal Nowej Listy */}
      <Modal isOpen={isNewListModalOpen} onClose={() => setIsNewListModalOpen(false)} title={t('shopping.createList')} maxWidth="sm">
        <form onSubmit={handleCreateList} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === 'en' ? 'List name *' : 'Nazwa listy *'}
            </label>
            <input
              type="text"
              required
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t('shopping.listNamePlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewListModalOpen(false)}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs font-semibold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors"
            >
              {t('shopping.addListBtn')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
