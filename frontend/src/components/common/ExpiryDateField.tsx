import React from 'react';
import { Calendar } from 'lucide-react';
import { FieldLabel } from '../ui/FormControls';
import { Button } from '../ui/Button';
import { VoiceDateInput } from './VoiceDateInput';
import { useLanguage } from '../../language/LanguageContext';

const QUICK_DATES = [
  { labelKey: 'pantry.quickDate3d', unit: 'd', amount: 3 },
  { labelKey: 'pantry.quickDate1w', unit: 'd', amount: 7 },
  { labelKey: 'pantry.quickDate2w', unit: 'd', amount: 14 },
  { labelKey: 'pantry.quickDate1m', unit: 'm', amount: 1 },
  { labelKey: 'pantry.quickDate6m', unit: 'm', amount: 6 },
  { labelKey: 'pantry.quickDate1y', unit: 'm', amount: 12 },
] as const;

/** Today plus N days / months as a local `YYYY-MM-DD` date. */
const quickDate = (unit: 'd' | 'm', amount: number) => {
  const d = new Date();
  if (unit === 'd') d.setDate(d.getDate() + amount);
  else d.setMonth(d.getMonth() + amount);
  return d.toLocaleDateString('sv-SE');
};

interface ExpiryDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  voice: React.ComponentProps<typeof VoiceDateInput>['voice'];
}

/** Expiry date: one tap on a shortcut is the fast path, the date field and voice input are the fallback. */
export const ExpiryDateField: React.FC<ExpiryDateFieldProps> = ({ value, onChange, voice }) => {
  const { t } = useLanguage();

  return (
    <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
      <div className="flex items-center justify-between">
        <FieldLabel className="flex items-center gap-1.5 mb-0">
          <Calendar className="w-4 h-4 text-amber-400" /> {t('pantry.expiryDate')}
        </FieldLabel>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold"
          >
            {t('pantry.clearDate')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {QUICK_DATES.map(({ labelKey, unit, amount }) => {
          const date = quickDate(unit, amount);
          return (
            <Button
              key={labelKey}
              variant={value === date ? 'primary' : 'secondary'}
              className="py-2.5 text-xs font-semibold"
              onClick={() => onChange(date)}
            >
              {t(labelKey)}
            </Button>
          );
        })}
      </div>

      <VoiceDateInput value={value} onChange={onChange} voice={voice} />
    </div>
  );
};
