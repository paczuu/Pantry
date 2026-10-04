import React, { useEffect, useMemo } from 'react';
import { usePantry } from '../contexts/PantryContext';
import { useLanguage } from '../language/LanguageContext';
import { PantryItem } from '../types';
import { getExpiryStatus } from '../utils/expiry';
import {
  Clock,
  AlertCircle,
  PackageOpen,
  QrCode,
  Plus,
  ArrowRight,
  MinusCircle,
  Package,
  Utensils,
  Leaf,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenScanner: (mode?: 'ADD' | 'REMOVE') => void;
  onOpenAddManual: () => void;
  onEditItem: (item: PantryItem) => void;
  setActiveTab: (tab: string) => void;
}

const MAX_URGENT = 5;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Polska odmiana: 1 produkt, 2-4 produkty, 5+ produktów
const plProducts = (n: number) => {
  if (n === 1) return 'produkt';
  const last = n % 10;
  const lastTwo = n % 100;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? 'produkty' : 'produktów';
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenScanner,
  onOpenAddManual,
  onEditItem,
  setActiveTab,
}) => {
  const { items, stats, setFilter, resetFilters, consumeItem, expiryWarningDays } = usePantry();
  const { t, language } = useLanguage();
  const en = language === 'en';

  // Filtry ze spiżarni (ustawiane kliknięciem w kafelek) nie mogą zaburzać pulpitu
  useEffect(() => {
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = startOfDay(new Date());

  const urgentItems = useMemo(
    () =>
      items
        .filter((item) => {
          const s = getExpiryStatus(item.expiryDate, expiryWarningDays);
          return s === 'expired' || s === 'warning';
        })
        .sort(
          (a, b) =>
            new Date(a.expiryDate as string).getTime() - new Date(b.expiryDate as string).getTime()
        ),
    [items, expiryWarningDays]
  );

  const totalActive = stats?.totalActive || 0;
  const expiredCount = stats?.expiredCount || 0;
  const expiringCount = stats?.expiring3DaysCount || 0;
  const openedCount = stats?.openedCount || 0;
  const freshCount = Math.max(totalActive - expiredCount - expiringCount, 0);
  const attentionCount = expiredCount + expiringCount;

  const pct = (n: number) => (totalActive > 0 ? (n / totalActive) * 100 : 0);

  const goToPantry = (expiryFilter: string) => {
    setFilter('filterByExpiry', expiryFilter);
    setActiveTab('pantry');
  };

  const dateLabel = new Date().toLocaleDateString(en ? 'en-GB' : 'pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const headline =
    attentionCount === 0
      ? en
        ? 'All good in your pantry'
        : 'W spiżarni wszystko w porządku'
      : en
      ? `${attentionCount} ${attentionCount === 1 ? 'item' : 'items'} to use up`
      : `Do zużycia: ${attentionCount} ${plProducts(attentionCount)}`;

  const daysUntil = (item: PantryItem) =>
    Math.round((startOfDay(new Date(item.expiryDate as string)).getTime() - today.getTime()) / 86400000);

  const expiryLabel = (days: number) => {
    if (days < -1) return `${Math.abs(days)} ${t('common.expiredDaysAgo')}`;
    if (days === -1) return t('common.yesterday');
    if (days === 0) return t('common.today');
    if (days === 1) return t('common.tomorrow');
    return `${days} ${t('common.daysLeft')}`;
  };

  const handleConsume = async (item: PantryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.quantity <= 1) {
      const msg = en
        ? `Are you sure you want to consume the last piece of "${item.name}"?`
        : `Czy na pewno chcesz zużyć ostatnią sztukę "${item.name}"?`;
      if (!window.confirm(msg)) return;
    }
    await consumeItem(item.id, 1, false);
  };

  const statTiles = [
    {
      key: 'fresh',
      label: en ? 'Fresh' : 'Świeże',
      count: freshCount,
      icon: <Leaf className="w-4 h-4" />,
      dot: 'bg-emerald-500',
      iconCls: 'text-emerald-400',
      numCls: 'text-white',
      onClick: () => goToPantry('ALL'),
    },
    {
      key: 'soon',
      label: t('dashboard.expiringSoon'),
      count: expiringCount,
      icon: <Clock className="w-4 h-4" />,
      dot: 'bg-amber-400',
      iconCls: 'text-amber-400',
      numCls: expiringCount > 0 ? 'text-amber-300' : 'text-white',
      onClick: () => goToPantry('expiring_3_days'),
    },
    {
      key: 'expired',
      label: t('dashboard.expired'),
      count: expiredCount,
      icon: <AlertCircle className="w-4 h-4" />,
      dot: 'bg-rose-500',
      iconCls: 'text-rose-400',
      numCls: expiredCount > 0 ? 'text-rose-400' : 'text-white',
      onClick: () => goToPantry('expired'),
    },
    {
      key: 'opened',
      label: en ? 'Opened' : 'Otwarte',
      count: openedCount,
      icon: <PackageOpen className="w-4 h-4" />,
      dot: 'bg-cyan-400',
      iconCls: 'text-cyan-400',
      numCls: 'text-white',
      onClick: () => goToPantry('opened'),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Powitanie / status dnia */}
      <div>
        <p className="text-xs font-medium text-slate-400 capitalize">{dateLabel}</p>
        <h2
          className={`text-2xl font-extrabold tracking-tight mt-0.5 ${
            expiredCount > 0 ? 'text-white' : attentionCount > 0 ? 'text-white' : 'text-emerald-400'
          }`}
        >
          {headline}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {totalActive} {t('common.items')} {en ? 'in pantry' : 'w spiżarni'}
        </p>
      </div>

      {/* Akcje: duże pola dotykowe */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => onOpenScanner('ADD')}
          className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 transition-all"
        >
          <QrCode className="w-6 h-6" />
          {t('dashboard.scanBarcode')}
        </button>

        <button
          onClick={() => onOpenScanner('REMOVE')}
          className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl bg-slate-900/80 hover:bg-slate-900 active:scale-95 text-slate-200 border border-slate-800 font-semibold text-xs transition-all"
        >
          <MinusCircle className="w-6 h-6 text-rose-400" />
          {t('scanner.consumedBtn')}
        </button>

        <button
          onClick={onOpenAddManual}
          className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl bg-slate-900/80 hover:bg-slate-900 active:scale-95 text-slate-200 border border-slate-800 font-semibold text-xs transition-all"
        >
          <Plus className="w-6 h-6 text-slate-400" />
          {en ? 'Add manually' : 'Dodaj ręcznie'}
        </button>
      </div>

      {/* Świeżość: pasek + klikalne liczniki */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            {en ? 'Pantry freshness' : 'Świeżość spiżarni'}
          </h3>
          <button
            onClick={() => goToPantry('ALL')}
            className="text-xs font-semibold text-emerald-400 flex items-center gap-1 py-1.5 pl-2 -mr-1"
          >
            {en ? 'See all' : 'Zobacz wszystkie'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {totalActive > 0 ? (
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-slate-800">
            <div className="bg-emerald-500" style={{ width: `${pct(freshCount)}%` }} />
            <div className="bg-amber-400" style={{ width: `${pct(expiringCount)}%` }} />
            <div className="bg-rose-500" style={{ width: `${pct(expiredCount)}%` }} />
          </div>
        ) : (
          <div className="h-2.5 rounded-full bg-slate-800" />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statTiles.map((tile) => (
            <button
              key={tile.key}
              onClick={tile.onClick}
              className="flex items-center gap-3 min-h-[56px] px-3 py-2 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 text-left active:scale-95 transition-all"
            >
              <span className={`shrink-0 ${tile.iconCls}`}>{tile.icon}</span>
              <span className="min-w-0">
                <span className={`block text-xl font-extrabold leading-none ${tile.numCls}`}>
                  {tile.count}
                </span>
                <span className="block text-[11px] text-slate-400 mt-1 truncate">{tile.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wymagają uwagi */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-white">{t('dashboard.expiringProductsTitle')}</h3>
          {attentionCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {attentionCount}
            </span>
          )}
        </div>

        {urgentItems.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="text-emerald-400 font-bold text-sm">{t('dashboard.noExpiringProducts')}</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {en
                ? `No items in your pantry expire within the next ${expiryWarningDays} ${
                    expiryWarningDays === 1 ? 'day' : 'days'
                  }.`
                : `Żaden z produktów w Twojej spiżarni nie przekracza terminu ważności w najbliższych ${expiryWarningDays} ${
                    expiryWarningDays === 1 ? 'dniu' : 'dniach'
                  }.`}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 divide-y divide-slate-800 overflow-hidden">
            {urgentItems.slice(0, MAX_URGENT).map((item) => {
              const days = daysUntil(item);
              const isExpired = days < 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onEditItem(item)}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-900 active:bg-slate-800/60 transition-colors select-none"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-14 h-14 object-cover rounded-xl bg-slate-950 border border-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-emerald-400" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-extrabold text-white text-sm truncate leading-snug">{item.name}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          isExpired
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {expiryLabel(days)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.quantity} {t('common.pcs')}
                        {item.capacity ? ` · ${item.capacity}` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleConsume(item, e)}
                    className="shrink-0 flex items-center justify-center gap-1.5 min-w-[44px] h-11 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold active:scale-95 transition-all"
                    title={t('pantry.consumeOne')}
                    aria-label={t('pantry.consumeOne')}
                  >
                    <Utensils className="w-4 h-4" />
                    <span className="hidden sm:inline">{en ? 'Consume' : 'Zużyj'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {attentionCount > MAX_URGENT && (
          <button
            onClick={() => goToPantry(expiredCount > 0 ? 'expired' : 'expiring_3_days')}
            className="w-full flex items-center justify-center gap-1.5 min-h-[44px] rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-emerald-400 text-sm font-semibold active:scale-95 transition-all"
          >
            {t('dashboard.viewAllPantry')} ({attentionCount})
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};