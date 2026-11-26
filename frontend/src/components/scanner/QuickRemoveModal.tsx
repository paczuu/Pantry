import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { FieldLabel, Input } from '../ui/FormControls';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Modal } from '../common/Modal';
import { PantryItem, ProductCatalogItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
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
      // The error is reported in a toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Quick amount shortcuts; 2 and 5 only appear when that many pieces are in the pantry
  const presets = [
    { value: 1, label: `1 ${t('common.pcs')}`, onSelect: () => handleQuickPreset(1) },
    ...(totalInPantry >= 2 ? [{ value: 2, label: `2 ${t('common.pcs')}`, onSelect: () => handleQuickPreset(2) }] : []),
    ...(totalInPantry >= 5 ? [{ value: 5, label: `5 ${t('common.pcs')}`, onSelect: () => handleQuickPreset(5) }] : []),
    {
      value: totalInPantry,
      label: language === 'en' ? `All (${totalInPantry})` : `Wszystko (${totalInPantry})`,
      onSelect: handleRemoveAll,
    },
  ];

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
        {/* Product summary */}
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
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono border border-emerald-500/20">
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

          {/* Available batches */}
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

        {/* Quantity to remove */}
        <div className="space-y-2">
          <FieldLabel className="mb-0">
            {language === 'en'
              ? 'How many pieces do you want to remove / deduct?'
              : 'Ile sztuk chcesz usunąć / odliczyć?'}
          </FieldLabel>

          <div className="flex items-center justify-center gap-3">
            <Button
              size="icon"
              className="w-12 h-12"
              onClick={() => setAmount((a) => Math.max(1, a - 1))}
              disabled={amount <= 1}
              icon={<Minus className="w-5 h-5" />}
              aria-label="-1"
            />

            <div className="flex-1 max-w-[140px]">
              <Input
                type="number"
                min="1"
                max={totalInPantry}
                value={amount}
                onChange={(e) => setAmount(Math.min(totalInPantry, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-center font-extrabold text-2xl"
              />
            </div>

            <Button
              size="icon"
              className="w-12 h-12"
              onClick={() => setAmount((a) => Math.min(totalInPantry, a + 1))}
              disabled={amount >= totalInPantry}
              icon={<Plus className="w-5 h-5" />}
              aria-label="+1"
            />
          </div>

          {/* Quick quantity buttons */}
          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
            {presets.map(({ value, label, onSelect }) => (
              <Button
                key={label}
                size="sm"
                variant={amount === value ? 'primary' : 'secondary'}
                className="py-1 text-slate-300"
                onClick={onSelect}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Option: consumed vs wasted */}
        <SegmentedControl
          fill
          className="mt-2"
          value={isWasted ? 'wasted' : 'consumed'}
          onChange={(option) => setIsWasted(option === 'wasted')}
          options={[
            { value: 'consumed', icon: <Utensils className="w-4 h-4" />, label: t('scanner.consumedBtn') },
            {
              value: 'wasted',
              icon: <Trash2 className="w-4 h-4" />,
              label: t('scanner.wastedBtn'),
              activeClassName: 'bg-rose-500 text-white shadow-md',
            },
          ]}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            className={isWasted ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/40' : undefined}
            onClick={handleConfirm}
            disabled={isSubmitting || amount <= 0}
            icon={isWasted ? <Trash2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          >
            {isSubmitting
              ? (language === 'en' ? 'Removing...' : 'Usuwanie...')
              : `${language === 'en' ? 'Remove' : 'Usuń'} ${amount} ${t('common.pcs')}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
