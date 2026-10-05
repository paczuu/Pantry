import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PantryItemThumb } from '../common/PantryItemThumb';
import { ProductCatalogItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { useVoiceExpiry } from '../../hooks/useVoiceExpiry';
import { api } from '../../services/api';
import {
  Plus,
  Minus,
  Calendar,
  Tag,
  Image as ImageIcon,
  Camera,
  Check,
  Scale,
  PackageOpen,
  Mic,
  MicOff,
  Loader2,
  SearchX,
  Barcode,
  X,
} from 'lucide-react';

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
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  // Snapshot do śledzenia isDirty
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

  // Hook głosowego wprowadzania daty
  const { isListening, isSupported, spokenTranscript, toggleListening } = useVoiceExpiry(
    (detectedDate) => {
      setExpiryDate(detectedDate);
    }
  );

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

  const addDaysToExpiry = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  const addMonthsToExpiry = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setExpiryDate(d.toISOString().split('T')[0]);
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
      await Promise.all([refreshPantry(), refreshStats()]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="flex items-center gap-2 mr-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="quick-add-form"
            disabled={isSubmitting}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            {t('common.add')}
          </button>
        </div>
      }
    >
      <form id="quick-add-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Podgląd po znalezieniu produktu w bazie */}
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
                  <span className="text-xs text-slate-300 font-semibold bg-slate-800 px-2 py-0.2 rounded border border-slate-700">
                    {initialProduct.brand}
                  </span>
                )}
                {capacity && (
                  <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20 flex items-center gap-1">
                    <Scale className="w-3 h-3" /> {capacity}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : barcode ? (
          /* Informacja i zeskanowany EAN w przypadku braku produktu w bazie */
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

        {/* Nazwa i Producent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">{t('pantry.nameLabel')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'en' ? 'e.g. Milk 3.2%, Pasta...' : 'np. Mleko 3.2%, Makaron...'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">{t('pantry.brandLabel')}</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={language === 'en' ? 'e.g. Barilla, Heinz' : 'np. Łaciate, Barilla, Piątnica'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Ilość (Wyłącznie sztuki) + Tylko do odczytu Pojemność jako informacja */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-200">{t('pantry.quantity')} ({t('common.pieces')})</label>
            <p className="text-[11px] text-slate-400">
              {capacity ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <Scale className="w-3 h-3" /> {t('pantry.capacity')}: {capacity}
                </span>
              ) : (
                language === 'en' ? 'Specify how many pieces you are adding' : 'Podaj ile sztuk dodajesz do spiżarni'
              )}
            </p>
          </div>

          {/* Stepper ilości */}
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all font-bold"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="px-4 text-center min-w-[3.5rem]">
              <span className="text-base font-extrabold text-white">{quantity}</span>
              <span className="text-xs text-slate-400 ml-1 font-semibold">{t('common.pcs')}</span>
            </div>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 transition-all font-bold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kategoria */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-cyan-400" /> {t('pantry.categoryLabel')}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {tCategory(cat.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Data ważności + Głosowe wprowadzanie (Mikrofon) */}
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" /> {t('pantry.expiryDate')}
            </label>
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

          {/* Pole wyboru daty + Przycisk mikrofonu */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />

            {/* Przycisk Głosowy */}
            {isSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/60 animate-pulse ring-2 ring-rose-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title={t('pantry.voiceHint')}
              >
                {isListening ? (
                  <>
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span className="hidden sm:inline">{t('pantry.listening')}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">{t('pantry.speakDate')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Wyświetlacz nasłuchiwania mowy */}
          {isListening && (
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {spokenTranscript
                  ? `${t('pantry.listening')} "${spokenTranscript}"`
                  : t('pantry.voiceHint')}
              </span>
            </div>
          )}

          {/* Szybkie przyciski wyboru daty */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => addDaysToExpiry(3)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-semibold transition-colors"
            >
              {t('pantry.quickDate3d')}
            </button>
            <button
              type="button"
              onClick={() => addDaysToExpiry(7)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-semibold transition-colors"
            >
              {t('pantry.quickDate1w')}
            </button>
            <button
              type="button"
              onClick={() => addDaysToExpiry(14)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-semibold transition-colors"
            >
              {t('pantry.quickDate2w')}
            </button>
            <button
              type="button"
              onClick={() => addMonthsToExpiry(1)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-semibold transition-colors"
            >
              {t('pantry.quickDate1m')}
            </button>
            <button
              type="button"
              onClick={() => addMonthsToExpiry(6)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-semibold transition-colors"
            >
              {t('pantry.quickDate6m')}
            </button>
            <button
              type="button"
              onClick={() => addMonthsToExpiry(12)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-semibold transition-colors"
            >
              {t('pantry.quickDate1y')}
            </button>
          </div>
        </div>

        {/* Data otwarcia */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 font-medium">
            <input
              type="checkbox"
              checked={isOpened}
              onChange={handleOpenedToggle}
              className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
            />
            <PackageOpen className="w-4 h-4 text-cyan-400" />
            <span>{t('pantry.openedToggle')}</span>
          </label>
          {isOpened && (
            <input
              type="date"
              value={openedDate}
              onChange={(e) => setOpenedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
            />
          )}
        </div>

        {/* Zdjęcie produktu */}
        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
          <label className="block text-xs font-semibold text-slate-300">{t('scanner.photoSection')}</label>
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
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  {t('scanner.takePhoto')}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
                  {t('scanner.chooseGallery')}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {t('scanner.photoSavedWithEan')}
              </p>
            </div>
          </div>
        </div>

        {/* Notatki */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">{t('pantry.notes')}</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'en' ? 'e.g. Opened sauce, consume within 3 days' : 'np. Otwarto sos, zjeść w 3 dni'}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </form>
    </Modal>
  );
};
