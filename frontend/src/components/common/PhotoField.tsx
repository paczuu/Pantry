import React, { useRef } from 'react';
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
}

/** Product photo picker: thumbnail + take photo / choose from gallery / remove. */
export const PhotoField: React.FC<PhotoFieldProps> = ({ value, onChange, hint }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      onChange(await compressImage(file));
      showToast(t('scanner.imageReady'), 'success');
    } catch {
      showToast(t('scanner.imageError'), 'error');
    } finally {
      // Allow picking the same file again
      input.value = '';
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
      <FieldLabel className="mb-0">{t('scanner.photoSection')}</FieldLabel>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      <div className="flex items-center gap-3">
        <PantryItemThumb src={value} alt="Preview" />

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />} onClick={() => cameraInputRef.current?.click()}>
              {t('scanner.takePhoto')}
            </Button>
            <Button size="sm" icon={<ImageIcon className="w-3.5 h-3.5 text-slate-300" />} onClick={() => galleryInputRef.current?.click()}>
              {t('scanner.chooseGallery')}
            </Button>
            {value && (
              <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => onChange('')}>
                {t('scanner.removePhoto')}
              </Button>
            )}
          </div>
          {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
};
