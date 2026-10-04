import React from 'react';
import { usePantry } from '../../contexts/PantryContext';
import { useLanguage } from '../../language/LanguageContext';
import {
  Search,
  LayoutGrid,
  List,
  Clock,
  AlertCircle,
  PackageOpen,
  ArrowUpDown,
  ScanBarcode,
  Boxes,
  Layers,
} from 'lucide-react';

export type GroupBy = 'category' | 'status' | 'none';

interface PantryFilterProps {
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  onOpenScannerSearch?: () => void;
  groupBy?: GroupBy;
  setGroupBy?: (g: GroupBy) => void;
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  activeCls: string;
  idleCls: string;
  title?: string;
}

const Chip: React.FC<ChipProps> = ({ active, onClick, icon, label, count, activeCls, idleCls, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95 ${
      active ? activeCls : idleCls
    }`}
  >
    {icon}
    {label}
    <span
      className={`px-1.5 rounded-full text-[11px] font-extrabold ${
        active ? 'bg-black/20' : 'bg-slate-800/80'
      }`}
    >
      {count}
    </span>
  </button>
);

export const PantryFilter: React.FC<PantryFilterProps> = ({
  viewMode,
  setViewMode,
  onOpenScannerSearch,
  groupBy,
  setGroupBy,
}) => {
  const { filters, setFilter, categories, stats, expiryWarningDays } = usePantry();
  const { t, tCategory, language } = useLanguage();
  const en = language === 'en';

  const toggleExpiry = (value: string) =>
    setFilter('filterByExpiry', filters.filterByExpiry === value ? 'ALL' : value);

  const expiredCount = stats?.expiredCount || 0;
  const expiringCount = stats?.expiring3DaysCount || 0;
  const openedCount = stats?.openedCount || 0;

  const warningUnit = en ? 'd' : expiryWarningDays === 1 ? 'dzień' : 'dni';

  const groupOptions: { key: GroupBy; label: string }[] = [
    { key: 'category', label: t('pantry.groupCategory') },
    { key: 'status', label: t('pantry.groupStatus') },
    { key: 'none', label: t('pantry.groupNone') },
  ];

  return (
    <div className="space-y-3">
      {/* Rząd 1: Wyszukiwarka -> Sortowanie (ikona) -> Widok (siatka/lista) */}
      <div className="flex items-center gap-2">
        {/* Wyszukiwarka */}
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
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition-all flex items-center gap-1 p-1 px-2 text-[11px] font-bold"
                title={t('scanner.instructionSearch')}
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('pantry.scanProduct')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sortowanie */}
        <div className="relative shrink-0 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl p-2.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
          <ArrowUpDown className="w-4 h-4" />
          <select
            value={filters.sortBy}
            onChange={(e) => setFilter('sortBy', e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            title={en ? 'Sort items' : 'Sortuj produkty'}
          >
            <option value="name_asc">{t('pantry.sortNameAsc')}</option>
            <option value="name_desc">{t('pantry.sortNameDesc')}</option>
            <option value="expiry_asc">{t('pantry.sortExpiryAsc')}</option>
            <option value="expiry_desc">{t('pantry.sortExpiryDesc')}</option>
            <option value="quantity_desc">{t('pantry.sortQuantityDesc')}</option>
            <option value="created_desc">{t('pantry.sortNewest')}</option>
          </select>
        </div>

        {/* Przełącznik widoku */}
        <div className="flex items-center shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl transition-colors ${
              viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title={en ? 'Grid view' : 'Widok siatki'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-colors ${
              viewMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title={en ? 'List view' : 'Widok listy'}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rząd 2: chipy statusu (przewijane poziomo na telefonie) */}
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip
          active={filters.filterByExpiry === 'ALL'}
          onClick={() => setFilter('filterByExpiry', 'ALL')}
          icon={<Boxes className="w-3.5 h-3.5" />}
          label={t('common.all')}
          count={stats?.totalActive || 0}
          activeCls="bg-emerald-500 text-slate-950 border-emerald-400"
          idleCls="bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800"
        />

        <Chip
          active={filters.filterByExpiry === 'expired'}
          onClick={() => toggleExpiry('expired')}
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          label={t('dashboard.expired')}
          count={expiredCount}
          activeCls="bg-rose-500 text-white border-rose-400"
          idleCls={
            expiredCount > 0
              ? 'bg-rose-950/30 text-rose-300 border-rose-500/40 hover:bg-rose-950/50'
              : 'bg-slate-900/80 text-slate-500 border-slate-800'
          }
        />

        <Chip
          active={filters.filterByExpiry === 'expiring_3_days'}
          onClick={() => toggleExpiry('expiring_3_days')}
          icon={<Clock className="w-3.5 h-3.5" />}
          label={t('dashboard.expiringSoon')}
          title={`${expiryWarningDays} ${warningUnit}`}
          count={expiringCount}
          activeCls="bg-amber-500 text-slate-950 border-amber-400"
          idleCls={
            expiringCount > 0
              ? 'bg-amber-950/30 text-amber-300 border-amber-500/40 hover:bg-amber-950/50'
              : 'bg-slate-900/80 text-slate-500 border-slate-800'
          }
        />

        <Chip
          active={filters.filterByExpiry === 'opened'}
          onClick={() => toggleExpiry('opened')}
          icon={<PackageOpen className="w-3.5 h-3.5" />}
          label={en ? 'Opened' : 'Otwarte'}
          count={openedCount}
          activeCls="bg-cyan-500 text-slate-950 border-cyan-400"
          idleCls="bg-slate-900/80 text-slate-400 border-slate-800 hover:text-cyan-300"
        />
      </div>

      {/* Rząd 3: kategoria, grupowanie, reset */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="ALL">{t('pantry.categoryAll')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {tCategory(c.name)}
            </option>
          ))}
        </select>

        {groupBy && setGroupBy && (
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              {groupOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setGroupBy(opt.key)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    groupBy === opt.key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};