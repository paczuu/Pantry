import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { FieldLabel } from '../ui/FormControls';
import { Button } from '../ui/Button';
import { PantryItemThumb } from './PantryItemThumb';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { compressImage } from '../../utils/image';

interface PhotoFieldProps {
  /** Current image (URL or data URL); empty string = no photo. */
  value: string;
  onChange: (value: string) => void;
  /** Optional helper text under the buttons. */
  hint?: string;
  /** Field title; defaults to the product photo label. */
  label?: string;
  /** Custom image preparation (resize / size limits); its error message is shown to the user. */
  compress?: (file: File) => Promise<string>;
  /** Toast shown after a photo was added; defaults to the product wording. */
  successMessage?: string;
  /** Reports while a photo is being processed, so a parent can hold back saving. */
  onBusyChange?: (busy: boolean) => void;
}

/** Product photo picker: thumbnail + take photo / choose from gallery / remove. */
export const PhotoField: React.FC<PhotoFieldProps> = ({ value, onChange, hint, label, compress, successMessage, onBusyChange }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const setBusyState = (value: boolean) => {
    setBusy(value);
    onBusyChange?.(value);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      setBusyState(true);
      onChange(await (compress ?? compressImage)(file));
      showToast(successMessage ?? t('scanner.imageReady'), 'success');
    } catch (error: any) {
      showToast((compress && error?.message) || t('scanner.imageError'), 'error');
    } finally {
      setBusyState(false);
      // Allow picking the same file again
      input.value = '';
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
      <FieldLabel className="mb-0">{label ?? t('scanner.photoSection')}</FieldLabel>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      <div className="flex items-center gap-3">
        <PantryItemThumb src={value} alt="Preview" />

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy} icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />} onClick={() => cameraInputRef.current?.click()}>
              {t('scanner.photoTake')}
            </Button>
            <Button size="sm" disabled={busy} icon={<ImageIcon className="w-3.5 h-3.5 text-slate-300" />} onClick={() => galleryInputRef.current?.click()}>
              {t('scanner.photoChoose')}
            </Button>
            {value && (
              <Button size="sm" variant="danger" disabled={busy} icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => onChange('')}>
                {t('scanner.photoRemove')}
              </Button>
            )}
          </div>
          {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
};
