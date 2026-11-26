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
          {language === 'en' ? `${absDays} ${dayLabel}` : `${absDays} ${dayLabel}`}
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
    <div className="flex flex-wrap items-center gap-1.5 [&>span]:whitespace-nowrap">
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

/**
 * Status terminu jako zwykły, kolorowy tekst (bez plakietki) — do zwartych wierszy listy.
 * Zwraca fragmenty `span`, więc można je łączyć w jednej linii z innymi informacjami.
 */
export const ExpiryText: React.FC<{
  expiryDate?: string | null;
  openedDate?: string | null;
}> = ({ expiryDate, openedDate }) => {
  const { expiryWarningDays } = usePantry();
  const { language } = useLanguage();
  const en = language === 'en';

  if (!expiryDate && !openedDate) return null;

  const locale = en ? 'en-US' : 'pl-PL';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let text = '';
  let cls = '';

  if (expiryDate) {
    const exp = new Date(expiryDate);
    const expClean = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
    const days = Math.round((expClean.getTime() - today.getTime()) / 86400000);

    if (days < 0) {
      const abs = Math.abs(days);
      text = en
        ? `${abs} ${abs === 1 ? 'day' : 'days'} overdue`
        : `${abs} ${abs === 1 ? 'dzień' : 'dni'} po terminie`;
      cls = 'text-rose-400';
    } else if (days === 0) {
      text = en ? 'Expires today' : 'Wygasa dzisiaj';
      cls = 'text-rose-400';
    } else if (days === 1) {
      text = en ? 'Expires tomorrow' : 'Wygasa jutro';
      cls = 'text-amber-300';
    } else if (days <= expiryWarningDays) {
      text = en ? `Expires in ${days} days` : `Wygasa za ${days} dni`;
      cls = 'text-amber-400';
    } else if (days <= 7) {
      text = en ? `In ${days} days` : `Za ${days} dni`;
      cls = 'text-yellow-400';
    } else {
      text = `${en ? 'Until' : 'Do'} ${exp.toLocaleDateString(locale)}`;
      cls = 'text-emerald-400';
    }
  }

  return (
    <>
      {text && <span className={`font-medium ${cls}`}>{text}</span>}
      {openedDate && (
        <span className="text-cyan-300">
          {text ? ' · ' : ''}
          {en ? 'Opened ' : 'Otwarte '}
          {new Date(openedDate).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </>
  );
};
