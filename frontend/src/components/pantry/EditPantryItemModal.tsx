import React, { useState, useEffect, useCallback } from 'react';
import { FieldLabel, Input, Select } from '../ui/FormControls';
import { Modal } from '../common/Modal';
import { ExpiryDateField } from '../common/ExpiryDateField';
import { OpenedDateField } from '../common/OpenedDateField';
import { ExpiryBadge } from '../common/ExpiryBadge';
import { PantryItemThumb } from '../common/PantryItemThumb';
import { PhotoField } from '../common/PhotoField';
import { ModalActions } from '../ui/ModalActions';
import { QuantityStepper } from '../ui/QuantityStepper';
import { PantryItem } from '../../types';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { useVoiceExpiry } from '../../hooks/useVoiceExpiry';
import { api } from '../../services/api';
import { Tag, Scale, Barcode } from 'lucide-react';

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
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState({
    name: '',
    brand: '',
    quantity: 1,
    category: 'Other',
    expiryDate: '',
    openedDate: '',
    notes: '',
    imageUrl: '',
  });

  const isDirty =
    name !== initialSnapshot.name ||
    brand !== initialSnapshot.brand ||
    quantity !== initialSnapshot.quantity ||
    category !== initialSnapshot.category ||
    expiryDate !== initialSnapshot.expiryDate ||
    openedDate !== initialSnapshot.openedDate ||
    notes !== initialSnapshot.notes ||
    imageUrl !== initialSnapshot.imageUrl;

  const handleVoiceDateDetected = useCallback((detectedDate: string) => {
    setExpiryDate(detectedDate);
  }, []);

  const voice = useVoiceExpiry(handleVoiceDateDetected);
  const { isListening, stopListening } = voice;

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
      const initImg = item.imageUrl || '';

      setName(initName);
      setBrand(initBrand);
      setQuantity(initQty);
      setCapacity(initCap);
      setCategory(initCat);
      setExpiryDate(initExp);
      setOpenedDate(initOp);
      setNotes(initNotes);
      setImageUrl(initImg);

      setInitialSnapshot({
        name: initName,
        brand: initBrand,
        quantity: initQty,
        category: initCat,
        expiryDate: initExp,
        openedDate: initOp,
        notes: initNotes,
        imageUrl: initImg,
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
        // null removes the photo; unchanged photos are not re-sent
        ...(imageUrl !== initialSnapshot.imageUrl && { imageUrl: imageUrl || null }),
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
      headerActions={<ModalActions formId="edit-pantry-form" isSubmitting={isSubmitting} onCancel={handleClose} />}
    >
      <form id="edit-pantry-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Summary: photo, live expiry status and barcode */}
        <div className="flex items-center gap-3.5">
          <PantryItemThumb src={imageUrl} alt={name} className="!w-16 !h-16 !rounded-2xl" />
          <div className="min-w-0 flex flex-col items-start gap-1.5">
            <ExpiryBadge expiryDate={expiryDate || null} openedDate={openedDate || null} />
            <div className="flex flex-wrap items-center gap-1.5">
              {item.barcode && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                  <Barcode className="w-3 h-3" />
                  {item.barcode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Name and brand */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>
              {t('pantry.nameLabel')}
            </FieldLabel>

            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>
              {t('pantry.brandLabel')}
            </FieldLabel>

            <Input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>
        </div>

        {/* Quantity + capacity */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3">
          <div>
            <FieldLabel className="mb-0">
              {t('pantry.quantity')} ({t('common.pieces')})
            </FieldLabel>

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

          <QuantityStepper
            alwaysShowUnit
            quantity={quantity}
            unit={t('common.pcs')}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => q + 1)}
          />
        </div>

        <ExpiryDateField value={expiryDate} onChange={setExpiryDate} voice={voice} />

        <OpenedDateField value={openedDate} onChange={setOpenedDate} />

        {/* Category */}
        <div>
          <FieldLabel className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            {t('pantry.categoryLabel')}
          </FieldLabel>

          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {tCategory(cat.name)}
              </option>
            ))}
          </Select>
        </div>

        <PhotoField value={imageUrl} onChange={setImageUrl} />

        {/* Notes */}
        <div>
          <FieldLabel>
            {t('pantry.notes')}
          </FieldLabel>

          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'en' ? 'Additional notes...' : 'Dodatkowe uwagi...'}
            className="py-2"
          />
        </div>
      </form>
    </Modal>
  );
};
