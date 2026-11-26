import React, { useState, useEffect } from 'react';
import { FieldLabel, Input, Select } from '../ui/FormControls';
import { Modal } from '../common/Modal';
import { ExpiryDateField } from '../common/ExpiryDateField';
import { OpenedDateField } from '../common/OpenedDateField';
import { Button } from '../ui/Button';
import { ModalActions } from '../ui/ModalActions';
import { QuantityStepper } from '../ui/QuantityStepper';
import { PantryItemThumb } from '../common/PantryItemThumb';
import { PhotoField } from '../common/PhotoField';
import { ProductCatalogItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { useVoiceExpiry } from '../../hooks/useVoiceExpiry';
import { api } from '../../services/api';
import { Check, ChevronDown, ChevronUp, Tag, Scale, SearchX, Barcode } from 'lucide-react';

/** Quick expiry shortcuts: translation key, unit (days / months) and amount. */
interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: ProductCatalogItem | null;
  barcode?: string;
  onSuccess?: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialProduct,
  barcode,
  onSuccess,
}) => {
  const { categories, refreshPantry, refreshStats } = usePantry();
  const { showToast, playBeep } = useToast();
  const { t, tCategory, language } = useLanguage();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Other');
  const [quantity, setQuantity] = useState(1);
  const [capacity, setCapacity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [openedDate, setOpenedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Snapshot used to track isDirty
  const [initialSnapshot, setInitialSnapshot] = useState({
    name: '',
    brand: '',
    category: 'Other',
    quantity: 1,
    capacity: '',
    expiryDate: '',
    openedDate: '',
    notes: '',
    imageUrl: '',
  });

  const isDirty =
    name !== initialSnapshot.name ||
    brand !== initialSnapshot.brand ||
    category !== initialSnapshot.category ||
    quantity !== initialSnapshot.quantity ||
    capacity !== initialSnapshot.capacity ||
    expiryDate !== initialSnapshot.expiryDate ||
    openedDate !== initialSnapshot.openedDate ||
    notes !== initialSnapshot.notes ||
    imageUrl !== initialSnapshot.imageUrl;

  // Voice date input hook
  const voice = useVoiceExpiry(setExpiryDate);

  useEffect(() => {
    if (initialProduct) {
      const initName = initialProduct.name || '';
      const initBrand = initialProduct.brand || '';
      // Providers can return a category this household does not have: fall back to "Other"
      const known = (name?: string | null) => !!name && categories.some((cat) => cat.name === name);
      const initCat = known(initialProduct.category)
        ? initialProduct.category!
        : known('Other')
          ? 'Other'
          : categories[0]?.name || 'Other';
      const initCap = initialProduct.capacity || '';
      const initImg = initialProduct.imageUrl || '';

      setName(initName);
      setBrand(initBrand);
      setCategory(initCat);
      setQuantity(1);
      setCapacity(initCap);
      setImageUrl(initImg);

      setInitialSnapshot({
        name: initName,
        brand: initBrand,
        category: initCat,
        quantity: 1,
        capacity: initCap,
        expiryDate: '',
        openedDate: '',
        notes: '',
        imageUrl: initImg,
      });
    } else {
      const initCat = categories[0]?.name || 'Other';
      setName('');
      setBrand('');
      setCategory(initCat);
      setQuantity(1);
      setCapacity('');
      setImageUrl('');

      setInitialSnapshot({
        name: '',
        brand: '',
        category: initCat,
        quantity: 1,
        capacity: '',
        expiryDate: '',
        openedDate: '',
        notes: '',
        imageUrl: '',
      });
    }

    setExpiryDate('');
    setShowMore(false);
    setOpenedDate('');
    setNotes('');
  }, [initialProduct, isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(language === 'en' ? 'Please enter product name.' : 'Podaj nazwę produktu.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.addPantryItem({
        barcode: barcode?.trim() || initialProduct?.barcode || null,
        name: name.trim(),
        brand: brand.trim() || null,
        category,
        quantity: Math.max(1, quantity),
        capacity: capacity.trim() || null,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        openedDate: openedDate ? new Date(openedDate).toISOString() : null,
        notes: notes.trim() || null,
        imageUrl: imageUrl || null,
      });

      showToast(res.message || t('scanner.productAddedSuccess'), 'success');
      playBeep(880, 'sine', 0.12);
      // Refresh in the background: the form closes right away so the next scan can start
      void Promise.all([refreshPantry(), refreshStats()]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nameAndBrandFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <FieldLabel>{t('pantry.nameLabel')}</FieldLabel>
        <Input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={language === 'en' ? 'e.g. Milk 3.2%, Pasta...' : 'np. Mleko 3.2%, Makaron...'}
        />
      </div>
      <div>
        <FieldLabel>{t('pantry.brandLabel')}</FieldLabel>
        <Input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder={language === 'en' ? 'e.g. Barilla, Heinz' : 'np. Łaciate, Barilla, Piątnica'}
        />
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialProduct
          ? t('scanner.productFromScanner')
          : barcode
          ? t('scanner.newProductFromEan')
          : t('scanner.addTitle')
      }
      maxWidth="lg"
      isDirty={isDirty}
      headerActions={
        <ModalActions formId="quick-add-form" submitLabel={t('common.add')} isSubmitting={isSubmitting} onCancel={onClose} />
      }
    >
      <form id="quick-add-form" onSubmit={handleSubmit} className="space-y-3">
        {/* Preview when the product was found in the catalog */}
        {initialProduct ? (
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
            <PantryItemThumb src={imageUrl} alt={name} />

            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-white truncate text-sm sm:text-base">
                {initialProduct.name}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">
                  EAN: <strong className="font-mono text-slate-300">{barcode || initialProduct.barcode}</strong>
                </span>
                {initialProduct.brand && (
                  <span className="text-xs text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {initialProduct.brand}
                  </span>
                )}
                {capacity && (
                  <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <Scale className="w-3 h-3" /> {capacity}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : barcode ? (
          /* Info and the scanned EAN when the product is not in the catalog */
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-amber-200">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <SearchX className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{t('scanner.itemNotFound')}</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                  <Barcode className="w-3 h-3" /> {barcode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {language === 'en' ? 'Enter product name and details manually.' : 'Wprowadź nazwę i dane artykułu ręcznie.'}
              </p>
            </div>
          </div>
        ) : null}

        {/* Unknown product: the name has to be typed */}
        {!initialProduct && nameAndBrandFields}

        {/* Quantity (pieces only) + read-only capacity as information */}
        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3">
          <div>
            <FieldLabel className="mb-0">{t('pantry.quantity')} ({t('common.pieces')})</FieldLabel>
            {capacity && (
              <p className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1 mt-0.5">
                <Scale className="w-3 h-3" /> {t('pantry.capacity')}: {capacity}
              </p>
            )}
          </div>

          <QuantityStepper
            alwaysShowUnit
            quantity={quantity}
            unit={t('common.pcs')}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => q + 1)}
          />
        </div>

        <ExpiryDateField value={expiryDate} onChange={setExpiryDate} voice={voice} />

        <Button variant="primary" size="lg" type="submit" fullWidth disabled={isSubmitting} icon={<Check className="w-4 h-4 stroke-[2.5]" />}>
          {t('common.add')}
        </Button>

        {/* Everything else is optional and stays out of the way */}
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          aria-expanded={showMore}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {t('scanner.moreDetails')}
        </button>

        {showMore && (
          <div className="space-y-4">
            {initialProduct && nameAndBrandFields}

            {/* Category */}
            <div>
              <FieldLabel className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cyan-400" /> {t('pantry.categoryLabel')}
              </FieldLabel>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {tCategory(cat.name)}
                  </option>
                ))}
              </Select>
            </div>

            <OpenedDateField value={openedDate} onChange={setOpenedDate} />

            <PhotoField value={imageUrl} onChange={setImageUrl} hint={t('scanner.photoSavedWithEan')} />

            {/* Notes */}
            <div>
              <FieldLabel>{t('pantry.notes')}</FieldLabel>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'en' ? 'e.g. Opened sauce, consume within 3 days' : 'np. Otwarto sos, zjeść w 3 dni'}
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
