import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PantryItem, ProductCatalogItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { ExpiryBadge } from '../common/ExpiryBadge';
import { Minus, Plus, Trash2, Utensils, CheckCircle } from 'lucide-react';

interface QuickRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  inPantryItems: PantryItem[];
  productCatalog?: ProductCatalogItem | null;
  onSuccess?: () => void;
}

export const QuickRemoveModal: React.FC<QuickRemoveModalProps> = ({
  isOpen,
  onClose,
  barcode,
  inPantryItems,
  productCatalog,
  onSuccess,
}) => {
  const { barcodeQuickRemove } = usePantry();
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const totalInPantry = inPantryItems.reduce((acc, item) => acc + item.quantity, 0);
  const primaryItem = inPantryItems[0];
  const productName = primaryItem?.name || productCatalog?.name || (language === 'en' ? 'Product' : 'Produkt');

  const [amount, setAmount] = useState<number>(1);
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');
  const [isWasted, setIsWasted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleQuickPreset = (val: number) => {
    setAmount(Math.min(totalInPantry, Math.max(1, val)));
  };

  const handleRemoveAll = () => {
    setAmount(totalInPantry);
  };

  const handleConfirm = async () => {
    if (amount <= 0) {
      showToast(
        language === 'en'
          ? 'Select quantity to remove.'
          : 'Wybierz ilość do usunięcia.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await barcodeQuickRemove({
        barcode: selectedItemId === 'ALL' ? barcode : undefined,
        itemId: selectedItemId !== 'ALL' ? selectedItemId : undefined,
        amount,
        isWasted,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      // Błąd w toascie
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        language === 'en'
          ? 'Quick Consume / Remove (Barcode EAN)'
          : 'Szybkie zużycie / usuwanie (Skaner EAN)'
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Podsumowanie produktu */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-400 font-mono mb-0.5">EAN: {barcode}</div>
              <h3 className="font-extrabold text-base sm:text-lg text-white truncate">{productName}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {primaryItem?.brand && (
                  <span className="text-xs text-slate-400 font-medium">{primaryItem.brand}</span>
                )}
                {primaryItem?.capacity && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-md font-mono border border-emerald-500/20">
                    {primaryItem.capacity}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs text-slate-400 font-medium">
                {language === 'en' ? 'Pantry stock:' : 'Stan w spiżarni:'}
              </div>
              <div className="text-xl font-extrabold text-emerald-400">
                {totalInPantry} <span className="text-sm font-semibold">{t('common.pcs')}</span>
              </div>
            </div>
          </div>

          {/* Dostępne partie */}
          {inPantryItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                {language === 'en' ? `Available batches (${inPantryItems.length}):` : `Dostępne partie (${inPantryItems.length}):`}
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {inPantryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer border transition-colors ${
                      selectedItemId === item.id
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                        : 'bg-slate-900/60 border-slate-700/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-bold">{item.quantity} {t('common.pcs')}</span>
                      {item.capacity && <span className="text-slate-400">({item.capacity})</span>}
                    </div>
                    <ExpiryBadge expiryDate={item.expiryDate} openedDate={item.openedDate} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Wybór ilości do usunięcia */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            {language === 'en'
              ? 'How many pieces do you want to remove / deduct?'
              : 'Ile sztuk chcesz usunąć / odliczyć?'}
          </label>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setAmount((a) => Math.max(1, a - 1))}
              disabled={amount <= 1}
              className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 disabled:opacity-40 transition-all font-bold"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="flex-1 max-w-[140px]">
              <input
                type="number"
                min="1"
                max={totalInPantry}
                value={amount}
                onChange={(e) => setAmount(Math.min(totalInPantry, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full text-center py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-extrabold text-2xl focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setAmount((a) => Math.min(totalInPantry, a + 1))}
              disabled={amount >= totalInPantry}
              className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 disabled:opacity-40 transition-all font-bold"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Szybkie przyciski ilości */}
          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
            <button
              type="button"
              onClick={() => handleQuickPreset(1)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                amount === 1 ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              1 {t('common.pcs')}
            </button>
            {totalInPantry >= 2 && (
              <button
                type="button"
                onClick={() => handleQuickPreset(2)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  amount === 2 ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                2 {t('common.pcs')}
              </button>
            )}
            {totalInPantry >= 5 && (
              <button
                type="button"
                onClick={() => handleQuickPreset(5)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  amount === 5 ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                5 {t('common.pcs')}
              </button>
            )}
            <button
              type="button"
              onClick={handleRemoveAll}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                amount === totalInPantry ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {language === 'en' ? `All (${totalInPantry})` : `Wszystko (${totalInPantry})`}
            </button>
          </div>
        </div>

        {/* Opcja: Zużyto vs Wyrzucono */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsWasted(false)}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
              !isWasted
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/50'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <Utensils className="w-4 h-4" />
            {t('scanner.consumedBtn')}
          </button>

          <button
            type="button"
            onClick={() => setIsWasted(true)}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
              isWasted
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/50'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {t('scanner.wastedBtn')}
          </button>
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
            type="submit"
            onClick={handleConfirm}
            disabled={isSubmitting || amount <= 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-98 disabled:opacity-50 ${
              isWasted
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-950/50'
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-950/50'
            }`}
          >
            {isWasted ? <Trash2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {isSubmitting
              ? (language === 'en' ? 'Removing...' : 'Usuwanie...')
              : `${language === 'en' ? 'Remove' : 'Usuń'} ${amount} ${t('common.pcs')}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
