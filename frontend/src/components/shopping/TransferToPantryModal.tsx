import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ShoppingList } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { api } from '../../services/api';
import { CheckCircle2 } from 'lucide-react';

interface TransferToPantryModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList | null;
  onSuccess?: () => void;
}

export const TransferToPantryModal: React.FC<TransferToPantryModalProps> = ({
  isOpen,
  onClose,
  list,
  onSuccess,
}) => {
  const { refreshPantry, refreshStats } = usePantry();
  const { showToast, playBeep } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkedItems = list?.items.filter((i) => i.isChecked) || [];

  const handleTransfer = async () => {
    if (!list || checkedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.transferCheckedToPantry(list.id);
      showToast(res.message || t('shopping.transferSuccess'), 'success');
      playBeep(920, 'sine', 0.15);
      await Promise.all([refreshPantry(), refreshStats()]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !list) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shopping.transferModalTitle')}
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-300">
          {t('shopping.transferModalDesc').replace('{name}', list.name)}
        </p>

        {/* Lista kupionych artykułów */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 max-h-56 overflow-y-auto space-y-2">
          <div className="text-xs font-bold text-slate-400">
            {t('shopping.transferItemsTitle')} ({checkedItems.length}):
          </div>
          {checkedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/40 last:border-none"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-white truncate">
                  {item.name}
                </span>
                {item.capacity && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({item.capacity})
                  </span>
                )}
              </div>
              <span className="text-emerald-400 font-mono font-bold shrink-0">
                {item.quantity} {t('common.pcs')}
              </span>
            </div>
          ))}
        </div>

        {/* Przyciski Akcji */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={isSubmitting || checkedItems.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting
              ? t('shopping.transferringBtn')
              : t('shopping.transferBtn').replace(
                  '{count}',
                  String(checkedItems.length)
                )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
