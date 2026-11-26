import React, { useState, useEffect, useRef } from 'react';
import { ShoppingList, ShoppingItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input } from '../ui/FormControls';
import { PageHeader } from '../ui/PageHeader';
import { Panel } from '../ui/Panel';
import { useLiveRefresh } from '../../contexts/RealtimeContext';
import { cn } from '../../utils/cn';
import { Plus, Trash2, ShoppingBag, Check, ListPlus, Scale } from 'lucide-react';

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
  const newItemNameRef = useRef<HTMLInputElement>(null);

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
      console.error('Error downloading shopping list:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useLiveRefresh('pantry_shopping_refresh', () => fetchLists(true));

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
      // Keep focus on the name field so the next item can be typed right away
      newItemNameRef.current?.focus();
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
      <PageHeader
        icon={<ShoppingBag />}
        title={t('shopping.title')}
        subtitle={
          language === 'en'
            ? 'Plan groceries and check off bought items'
            : 'Planuj zakupy i oznaczaj kupione produkty'
        }
        actions={
          <Button variant="primary" icon={<ListPlus className="w-4 h-4" />} collapseLabel onClick={() => setIsNewListModalOpen(true)}>
            {t('shopping.createList')}
          </Button>
        }
      />

      {/* List tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {lists.map((l) => {
          const isSelected = l.id === activeListId;
          const checked = l.items.filter((i) => i.isChecked).length;
          return (
            <button
              key={l.id}
              onClick={() => setActiveListId(l.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 border transition-all',
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              )}
            >
              <span>{l.name}</span>
              <span
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-bold',
                  isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                )}
              >
                {checked}/{l.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active list */}
      {activeList ? (
        <Panel className="p-4 sm:p-6 space-y-5 shadow-xl">
          {/* List title and bulk actions */}
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
                <Button variant="ghost" size="sm" className="font-normal" onClick={handleClearChecked}>
                  {t('shopping.clearChecked')}
                </Button>
              )}

              {lists.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-rose-400"
                  onClick={() => handleDeleteList(activeList.id, activeList.name)}
                  title={language === 'en' ? 'Delete list' : 'Usuń listę'}
                  aria-label={language === 'en' ? 'Delete list' : 'Usuń listę'}
                  icon={<Trash2 className="w-4 h-4" />}
                />
              )}
            </div>
          </div>

          {/* Quick add form */}
          <form onSubmit={handleAddItem} className="space-y-2">
            <div className="flex gap-2">
              <Input
                ref={newItemNameRef}
                type="text"
                required
                enterKeyHint="enter"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t('shopping.addItemPlaceholder')}
                className="flex-1 min-w-0 px-4 rounded-2xl"
              />

              {/* Quantity */}
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-2xl p-0.5 shrink-0">
                <input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 sm:w-12 text-center bg-transparent text-white text-sm font-bold focus:outline-none"
                />
                <span className="text-xs text-slate-400 pr-2 font-medium">{t('common.pcs')}</span>
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                className="px-3.5 sm:px-4 rounded-2xl shrink-0"
                aria-label={t('common.add')}
                icon={<Plus className="w-5 h-5 stroke-[2.5]" />}
              />
            </div>

            {/* Optional net weight / volume */}
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
                  <Input
                    type="text"
                    value={newItemCapacity}
                    onChange={(e) => setNewItemCapacity(e.target.value)}
                    placeholder={language === 'en' ? 'Net weight / volume (e.g. 500g, 1L)' : 'Pojemność / waga (np. 500g, 1L)'}
                    className="max-w-[14rem] min-w-0 px-3 py-2 text-xs"
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

          {/* Items */}
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
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5 rounded-2xl border transition-all',
                    item.isChecked
                      ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60'
                  )}
                >
                  {/* Checkbox and name */}
                  <div
                    onClick={() => handleToggleItem(item)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                  >
                    <button
                      type="button"
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                        item.isChecked
                          ? 'bg-emerald-500 text-slate-950'
                          : 'border-2 border-slate-600 text-transparent hover:border-emerald-400'
                      )}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="min-w-0 flex-1 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <span
                        className={cn(
                          'text-sm font-semibold line-clamp-2 sm:line-clamp-1 break-words min-w-0',
                          item.isChecked ? 'line-through text-slate-400' : 'text-white'
                        )}
                      >
                        {item.name}
                      </span>
                      {item.capacity && (
                        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono font-bold whitespace-nowrap">
                          {item.capacity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity chip and delete (quantity is set when the item is added) */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className="bg-slate-800 rounded-lg px-2 py-1 text-xs font-medium text-slate-200 whitespace-nowrap">
                      ×{item.quantity}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-500 hover:text-rose-400"
                      onClick={() => handleDeleteItem(item.id)}
                      aria-label={t('common.delete')}
                      icon={<Trash2 className="w-4 h-4" />}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      ) : (
        <div className="py-12 text-center text-slate-400">{t('common.loading')}</div>
      )}

      {/* New list modal */}
      <Modal isOpen={isNewListModalOpen} onClose={() => setIsNewListModalOpen(false)} title={t('shopping.createList')} maxWidth="sm">
        <form onSubmit={handleCreateList} className="space-y-4">
          <div>
            <FieldLabel>{language === 'en' ? 'List name *' : 'Nazwa listy *'}</FieldLabel>
            <Input
              type="text"
              required
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t('shopping.listNamePlaceholder')}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsNewListModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {t('shopping.addListBtn')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
