import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { PantryItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { useVoiceExpiry } from '../../hooks/useVoiceExpiry';
import { api } from '../../services/api';
import { Tag, Calendar, PackageOpen, Check, Scale, Minus, Plus, Mic, Loader2 } from 'lucide-react';

interface EditPantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PantryItem | null;
}

export const EditPantryItemModal: React.FC<EditPantryItemModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { categories, refreshPantry, refreshStats } = usePantry();
  const { showToast } = useToast();
  const { t, tCategory, language } = useLanguage();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [capacity, setCapacity] = useState('');
  const [category, setCategory] = useState('Other');
  const [expiryDate, setExpiryDate] = useState('');
  const [openedDate, setOpenedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState({
    name: '',
    brand: '',
    quantity: 1,
    category: 'Other',
    expiryDate: '',
    openedDate: '',
    notes: '',
  });

  const isDirty =
    name !== initialSnapshot.name ||
    brand !== initialSnapshot.brand ||
    quantity !== initialSnapshot.quantity ||
    category !== initialSnapshot.category ||
    expiryDate !== initialSnapshot.expiryDate ||
    openedDate !== initialSnapshot.openedDate ||
    notes !== initialSnapshot.notes;

  const handleVoiceDateDetected = useCallback((detectedDate: string) => {
    setExpiryDate(detectedDate);
  }, []);

  const { isListening, isSupported, spokenTranscript, toggleListening, stopListening } = useVoiceExpiry(handleVoiceDateDetected);

  useEffect(() => {
    if (item) {
      const initName = item.name || '';
      const initBrand = item.brand || '';
      const initQty = item.quantity || 1;
      const initCap = item.capacity || '';
      const initCat = item.category || 'Other';
      const initExp = item.expiryDate ? item.expiryDate.split('T')[0] : '';
      const initOp = item.openedDate ? item.openedDate.split('T')[0] : '';
      const initNotes = item.notes || '';

      setName(initName);
      setBrand(initBrand);
      setQuantity(initQty);
      setCapacity(initCap);
      setCategory(initCat);
      setExpiryDate(initExp);
      setOpenedDate(initOp);
      setNotes(initNotes);

      setInitialSnapshot({
        name: initName,
        brand: initBrand,
        quantity: initQty,
        category: initCat,
        expiryDate: initExp,
        openedDate: initOp,
        notes: initNotes,
      });
    }
  }, [item, isOpen]);

  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  const handleClose = () => {
    if (isListening) {
      stopListening();
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item || !name.trim()) return;

    if (isListening) {
      stopListening();
    }

    setIsSubmitting(true);

    try {
      await api.updatePantryItem(item.id, {
        name: name.trim(),
        brand: brand.trim() || null,
        quantity: Math.max(1, quantity),
        category,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        openedDate: openedDate ? new Date(openedDate).toISOString() : null,
        notes: notes.trim() || null,
      });

      showToast(t('pantry.updateSuccess'), 'success');

      await Promise.all([refreshPantry(), refreshStats()]);

      onClose();
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('pantry.editModalTitle')}
      maxWidth="lg"
      isDirty={isDirty}
      headerActions={
        <div className="flex items-center gap-2 mr-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="edit-pantry-form"
            disabled={isSubmitting}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            {t('common.save')}
          </button>
        </div>
      }
    >
      <form id="edit-pantry-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Nazwa i Producent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t('pantry.nameLabel')}
            </label>

            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t('pantry.brandLabel')}
            </label>

            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Ilość + Pojemność */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-200">
              {t('pantry.quantity')} ({t('common.pieces')})
            </label>

            <p className="text-[11px] text-slate-400">
              {capacity ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <Scale className="w-3 h-3" />
                  {t('pantry.capacity')}: {capacity}
                </span>
              ) : (
                language === 'en' ? 'Quantity in stock' : 'Liczba sztuk w magazynie'
              )}
            </p>
          </div>

          <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="px-3 text-white font-extrabold text-sm min-w-[3rem] text-center">
              {quantity} {t('common.pcs')}
            </span>

            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kategoria */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            {t('pantry.categoryLabel')}
          </label>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {tCategory(cat.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Data ważności + głos */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            {t('pantry.expiryDate')}
          </label>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />

            {isSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white border border-rose-400 animate-pulse'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                }`}
                title={t('pantry.voiceHint')}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-emerald-400'}`} />
                <span className="hidden sm:inline">
                  {isListening ? t('pantry.listening') : t('pantry.speakDate')}
                </span>
              </button>
            )}
          </div>

          {isListening && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2 animate-fade-in">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-semibold break-words">
                  {spokenTranscript || t('pantry.listening')}
                </div>
                {!spokenTranscript && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {t('pantry.voiceHint')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data otwarcia */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <PackageOpen className="w-3.5 h-3.5 text-cyan-400" />
            {t('pantry.openDateLabel')}
          </label>

          <input
            type="date"
            value={openedDate}
            onChange={(e) => setOpenedDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Notatki */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {t('pantry.notes')}
          </label>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'en' ? 'Additional notes...' : 'Dodatkowe uwagi...'}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </form>
    </Modal>
  );
};
