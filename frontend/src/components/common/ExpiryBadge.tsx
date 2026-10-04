import React from 'react';
import { AlertCircle, Clock, CheckCircle, PackageOpen } from 'lucide-react';
import { usePantry } from '../../contexts/PantryContext';
import { useLanguage } from '../../language/LanguageContext';

interface ExpiryBadgeProps {
  expiryDate?: string | null;
  openedDate?: string | null;
  className?: string;
}

export const ExpiryBadge: React.FC<ExpiryBadgeProps> = ({
  expiryDate,
  openedDate,
  className = '',
}) => {
  const { expiryWarningDays } = usePantry();
  const { language } = useLanguage();

  if (!expiryDate && !openedDate) {
    return null;
  }

  const locale = language === 'en' ? 'en-US' : 'pl-PL';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let statusEl = null;

  if (expiryDate) {
    const exp = new Date(expiryDate);
    const expClean = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
    const diffTime = expClean.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      const dayLabel = language === 'en' ? (absDays === 1 ? 'day overdue' : 'days overdue') : (absDays === 1 ? 'dzień po terminie' : 'dni po terminie');
      statusEl = (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {language === 'en' ? `Expired (${absDays} ${dayLabel})` : `Przeterminowane (${absDays} ${dayLabel})`}
        </span>
      );
    } else if (diffDays === 0) {
      statusEl = (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {language === 'en' ? 'Expires today!' : 'Wygasa dzisiaj!'}
        </span>
      );
    } else if (diffDays === 1) {
      statusEl = (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 ${className}`}
        >
          <Clock className="w-3.5 h-3.5" />
          {language === 'en' ? 'Expires tomorrow' : 'Wygasa jutro'}
        </span>
      );
    } else if (diffDays <= expiryWarningDays) {
      statusEl = (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}
        >
          <Clock className="w-3.5 h-3.5" />
          {language === 'en' ? `Expires in ${diffDays} days` : `Wygasa za ${diffDays} dni`}
        </span>
      );
    } else if (diffDays <= 7) {
      statusEl = (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 ${className}`}
        >
          <Clock className="w-3.5 h-3.5" />
          {language === 'en'
            ? `In ${diffDays} days (${exp.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })})`
            : `Za ${diffDays} dni (${exp.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })})`}
        </span>
      );
    } else {
      statusEl = (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
        >
          <CheckCircle className="w-3 h-3" />
          {language === 'en' ? `Until ${exp.toLocaleDateString(locale)}` : `Do ${exp.toLocaleDateString(locale)}`}
        </span>
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {statusEl}
      {openedDate && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <PackageOpen className="w-3 h-3" />
          {language === 'en' ? 'Opened ' : 'Otwarte '}
          {new Date(openedDate).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </div>
  );
};
