import React, { useState, useEffect } from 'react';
import { FieldLabel, Input, Select } from '../ui/FormControls';
import { Modal } from '../common/Modal';
import { VoiceDateInput } from '../common/VoiceDateInput';
import { Button } from '../ui/Button';
import { ModalActions } from '../ui/ModalActions';
import { QuantityStepper } from '../ui/QuantityStepper';
import { PantryItemThumb } from '../common/PantryItemThumb';
import { ProductCatalogItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { useVoiceExpiry } from '../../hooks/useVoiceExpiry';
import { api } from '../../services/api';
import { Calendar, Check, ChevronDown, ChevronUp, Tag, Image as ImageIcon, Camera, Scale, PackageOpen, SearchX, Barcode } from 'lucide-react';

/** Quick expiry shortcuts: translation key, unit (days / months) and amount. */
const QUICK_DATES = [
  { labelKey: 'pantry.quickDate3d', unit: 'd', amount: 3 },
  { labelKey: 'pantry.quickDate1w', unit: 'd', amount: 7 },
  { labelKey: 'pantry.quickDate2w', unit: 'd', amount: 14 },
  { labelKey: 'pantry.quickDate1m', unit: 'm', amount: 1 },
  { labelKey: 'pantry.quickDate6m', unit: 'm', amount: 6 },
  { labelKey: 'pantry.quickDate1y', unit: 'm', amount: 12 },
] as const;

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
  const [isOpened, setIsOpened] = useState(false);
  const [openedDate, setOpenedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

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
      const initCat = initialProduct.category || (categories[0]?.name || 'Other');
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
    setIsOpened(false);
    setOpenedDate('');
    setNotes('');
  }, [initialProduct, isOpen, categories]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressed);
          showToast(t('scanner.imageReady'), 'success');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      showToast(t('scanner.imageError'), 'error');
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  /** Today plus N days / months as a local `YYYY-MM-DD` date. */
  const quickDate = (unit: 'd' | 'm', amount: number) => {
    const d = new Date();
    if (unit === 'd') d.setDate(d.getDate() + amount);
    else d.setMonth(d.getMonth() + amount);
    return d.toLocaleDateString('sv-SE');
  };

  const handleOpenedToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsOpened(checked);
    if (checked && !openedDate) {
      setOpenedDate(new Date().toISOString().split('T')[0]);
    } else if (!checked) {
      setOpenedDate('');
    }
  };

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
        openedDate: isOpened && openedDate ? new Date(openedDate).toISOString() : null,
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

        {/* Expiry date: one tap on a shortcut is the fast path, the date field and voice are the fallback */}
        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <FieldLabel className="flex items-center gap-1.5 mb-0">
              <Calendar className="w-4 h-4 text-amber-400" /> {t('pantry.expiryDate')}
            </FieldLabel>
            {expiryDate && (
              <button
                type="button"
                onClick={() => setExpiryDate('')}
                className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold"
              >
                {t('pantry.clearDate')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_DATES.map(({ labelKey, unit, amount }) => {
              const value = quickDate(unit, amount);
              return (
                <Button
                  key={labelKey}
                  variant={expiryDate === value ? 'primary' : 'secondary'}
                  className="py-2.5 text-xs font-semibold"
                  onClick={() => setExpiryDate(value)}
                >
                  {t(labelKey)}
                </Button>
              );
            })}
          </div>

          <VoiceDateInput value={expiryDate} onChange={setExpiryDate} voice={voice} />
        </div>

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

            {/* Opened date */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={isOpened}
                  onChange={handleOpenedToggle}
                  className="w-5 h-5 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
                />
                <PackageOpen className="w-4 h-4 text-cyan-400" />
                <span>{t('pantry.openedToggle')}</span>
              </label>
              {isOpened && (
                <Input
                  type="date"
                  value={openedDate}
                  onChange={(e) => setOpenedDate(e.target.value)}
                  className="w-auto py-2 text-xs"
                />
              )}
            </div>

            {/* Product photo */}
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <FieldLabel className="mb-0">{t('scanner.photoSection')}</FieldLabel>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <PantryItemThumb src={imageUrl} alt="Preview" />

                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />}
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      {t('scanner.takePhoto')}
                    </Button>
                    <Button
                      size="sm"
                      icon={<ImageIcon className="w-3.5 h-3.5 text-slate-300" />}
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      {t('scanner.chooseGallery')}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">{t('scanner.photoSavedWithEan')}</p>
                </div>
              </div>
            </div>

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
