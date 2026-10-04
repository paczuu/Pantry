import React from 'react';
import { usePantry } from '../../contexts/PantryContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Search,
  LayoutGrid,
  List,
  RotateCcw,
  Clock,
  AlertCircle,
  PackageOpen,
  ArrowUpDown,
  ScanBarcode,
} from 'lucide-react';

interface PantryFilterProps {
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  onOpenScannerSearch?: () => void;
}

export const PantryFilter: React.FC<PantryFilterProps> = ({
  viewMode,
  setViewMode,
  onOpenScannerSearch,
}) => {
  const { filters, setFilter, resetFilters, categories, stats, expiryWarningDays } = usePantry();
  const { t, tCategory, language } = useLanguage();

  return (
    <div className="space-y-3.5 mb-6">
      {/* Pasek Wyszukiwania, Sortowania i Przełącznik Widoku */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Szukaj */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder={t('pantry.searchPlaceholder')}
            className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilter('search', '')}
                className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white"
              >
                {t('common.clear')}
              </button>
            )}
            {onOpenScannerSearch && (
              <button
                type="button"
                onClick={onOpenScannerSearch}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition-all flex items-center gap-1 px-2 text-[11px] font-bold"
                title={t('scanner.instructionSearch')}
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('pantry.scanProduct')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sortowanie i Widok */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={filters.sortBy}
              onChange={(e) => setFilter('sortBy', e.target.value)}
              className="w-full sm:w-auto pl-8 pr-8 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="expiry_asc">{t('pantry.sortExpiryAsc')}</option>
              <option value="expiry_desc">{t('pantry.sortExpiryDesc')}</option>
              <option value="name_asc">{t('pantry.sortNameAsc')}</option>
              <option value="name_desc">{t('pantry.sortNameDesc')}</option>
              <option value="quantity_desc">{t('pantry.sortQuantityDesc')}</option>
              <option value="created_desc">{t('pantry.sortNewest')}</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-colors ${
                viewMode === 'grid' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-colors ${
                viewMode === 'list' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Szybkie Filtry Ważności i Kategorie */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
        {/* Filtr terminu */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter('filterByExpiry', 'ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filters.filterByExpiry === 'ALL'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t('common.all')} ({stats?.totalActive || 0})
          </button>

          <button
            onClick={() => setFilter('filterByExpiry', filters.filterByExpiry === 'expiring_3_days' ? 'ALL' : 'expiring_3_days')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              filters.filterByExpiry === 'expiring_3_days'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {t('dashboard.expiringSoon')} ({expiryWarningDays} {language === 'en' ? (expiryWarningDays === 1 ? 'd' : 'd') : (expiryWarningDays === 1 ? 'dzień' : 'dni')}) ({stats?.expiring3DaysCount || 0})
          </button>

          <button
            onClick={() => setFilter('filterByExpiry', filters.filterByExpiry === 'expired' ? 'ALL' : 'expired')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              filters.filterByExpiry === 'expired'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-300'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            {t('dashboard.expired')} ({stats?.expiredCount || 0})
          </button>

          <button
            onClick={() => setFilter('filterByExpiry', filters.filterByExpiry === 'opened' ? 'ALL' : 'opened')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              filters.filterByExpiry === 'opened'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300'
            }`}
          >
            <PackageOpen className="w-3.5 h-3.5 text-cyan-400" />
            {language === 'en' ? 'Opened' : 'Otwarte'} ({stats?.openedCount || 0})
          </button>
        </div>

        {/* Wybór kategorii */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">{t('pantry.categoryAll')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {tCategory(c.name)}
                </option>
              ))}
            </select>
          </div>

          {(filters.category !== 'ALL' ||
            filters.search ||
            filters.filterByExpiry !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={t('pantry.resetFilters')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
