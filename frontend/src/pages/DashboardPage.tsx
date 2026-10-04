import React from 'react';
import { usePantry } from '../contexts/PantryContext';
import { PantryCard } from '../components/pantry/PantryCard';
import { PantryItem } from '../types';
import {
  Boxes,
  Clock,
  AlertCircle,
  PackageOpen,
  QrCode,
  Plus,
  ShoppingCart,
  BookOpen,
  ChefHat,
  ArrowRight,
  MinusCircle,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenScanner: (mode?: 'ADD' | 'REMOVE') => void;
  onOpenAddManual: () => void;
  onEditItem: (item: PantryItem) => void;
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenScanner,
  onOpenAddManual,
  onEditItem,
  setActiveTab,
}) => {
  const { items, stats, setFilter, expiryWarningDays } = usePantry();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const warningUntil = new Date(today);
  warningUntil.setDate(warningUntil.getDate() + expiryWarningDays);

  // Filtruj produkty wymagające uwagi (przeterminowane lub wygasające w 3 dni)
  const urgentItems = items.filter((item) => {
    if (!item.expiryDate) return false;
    const exp = new Date(item.expiryDate);
    return exp <= warningUntil;
  });

  const handleFilterClick = (expiryFilter: string) => {
    setFilter('filterByExpiry', expiryFilter);
    setActiveTab('pantry');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Szybki Pasek Akcji (Bez kafelka powitalnego) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-emerald-400" />
          <span className="font-extrabold text-white text-base">Pulpit Spiżarni</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenScanner('ADD')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition-all"
          >
            <QrCode className="w-4 h-4" />
            Skanuj
          </button>

          <button
            onClick={() => onOpenScanner('REMOVE')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 active:scale-95 font-bold text-xs sm:text-sm transition-all"
          >
            <MinusCircle className="w-4 h-4" />
            Zużyj
          </button>

          <button
            onClick={onOpenAddManual}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 font-semibold text-xs sm:text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Dodaj bez kodu
          </button>
        </div>
      </div>

      {/* Kafelki Statystyk */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Wszystkie */}
        <div
          onClick={() => { setFilter('filterByExpiry', 'ALL'); setActiveTab('pantry'); }}
          className="p-4 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Wszystkie produkty</span>
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {stats?.totalActive || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">w spiżarni</div>
        </div>

        {/* Wkrótce po terminie */}
        <div
          onClick={() => handleFilterClick('expiring_3_days')}
          className="p-4 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">Kończy się termin</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 mt-2">
            {stats?.expiring3DaysCount || 0}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">w ciągu {expiryWarningDays} {expiryWarningDays === 1 ? 'dnia' : 'dni'}</div>
        </div>

        {/* Przeterminowane */}
        <div
          onClick={() => handleFilterClick('expired')}
          className="p-4 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400">Przeterminowane</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2">
            {stats?.expiredCount || 0}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">wymagają weryfikacji</div>
        </div>

        {/* Otwarte */}
        <div
          onClick={() => handleFilterClick('opened')}
          className="p-4 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400">Otwarte opakowania</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
              <PackageOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 mt-2">
            {stats?.openedCount || 0}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-1">otwarte artykuły</div>
        </div>
      </div>

      {/* Sekcja: Wymagają Twojej Uwagi */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-white">Zużyj w pierwszej kolejności</h3>
            {urgentItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {urgentItems.length}
              </span>
            )}
          </div>

          <button
            onClick={() => { setFilter('filterByExpiry', 'expiring_3_days'); setActiveTab('pantry'); }}
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            Wszystkie produkty <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {urgentItems.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="text-emerald-400 font-bold text-sm">Wszystko świeże! 🥑</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Żaden z produktów w Twojej spiżarni nie przekracza terminu ważności w najbliższych {expiryWarningDays} {expiryWarningDays === 1 ? 'dniu' : 'dniach'}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {urgentItems.slice(0, 4).map((item) => (
              <PantryCard key={item.id} item={item} onEdit={onEditItem} viewMode="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
