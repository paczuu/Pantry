import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Input } from '../ui/FormControls';
import { useLanguage } from '../../language/LanguageContext';

interface OpenedDateFieldProps {
  /** `YYYY-MM-DD`, empty when the package is sealed. */
  value: string;
  onChange: (value: string) => void;
}

/** "Already opened" switch; ticking it stamps today's date, which can then be adjusted. */
export const OpenedDateField: React.FC<OpenedDateFieldProps> = ({ value, onChange }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 font-medium">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked ? new Date().toLocaleDateString('sv-SE') : '')}
          className="w-5 h-5 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
        />
        <PackageOpen className="w-4 h-4 text-cyan-400" />
        <span>{t('pantry.openedToggle')}</span>
      </label>
      {value && (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-auto py-2 text-xs"
        />
      )}
    </div>
  );
};
