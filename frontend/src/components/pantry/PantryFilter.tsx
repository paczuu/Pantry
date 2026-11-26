import React from 'react';
import { usePantry } from '../../contexts/PantryContext';
import { useLanguage } from '../../language/LanguageContext';
import { SearchInput, Select } from '../ui/FormControls';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../../utils/cn';
import {
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
    className={cn(
      'shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-all active:scale-95',
      active ? activeCls : idleCls
    )}
  >
    {icon}
    {label}
    <span
      className={cn('px-1.5 rounded-full text-[11px] font-extrabold', active ? 'bg-black/20' : 'bg-slate-800/80')}
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
      {/* Row 1: search -> sort (icon) -> view (grid/list) */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <SearchInput
          wrapperClassName="flex-1"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder={t('pantry.searchPlaceholder')}
          className={cn('pl-9 sm:pl-10 sm:pr-32', filters.search ? 'pr-24' : 'pr-12')}
          trailing={
            <>
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
                  className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 p-1.5 text-[11px] font-bold"
                  title={t('scanner.instructionSearch')}
                  aria-label={t('scanner.instructionSearch')}
                >
                  <ScanBarcode className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('pantry.scanProduct')}</span>
                </button>
              )}
            </>
          }
        />

        {/* Sorting: a native select overlaid on an icon button */}
        <div className="relative shrink-0 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl p-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
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

        {/* View switch */}
        <SegmentedControl
          size="icon"
          className="shrink-0 rounded-2xl bg-slate-900"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'grid', label: <LayoutGrid className="w-4 h-4" />, title: en ? 'Grid view' : 'Widok siatki' },
            { value: 'list', label: <List className="w-4 h-4" />, title: en ? 'List view' : 'Widok listy' },
          ]}
        />
      </div>

      {/* Row 2: status chips (horizontally scrollable on phones) */}
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 sm:-mx-1 sm:px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {/* Row 3: category, grouping, reset */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Select
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          className="flex-1 sm:flex-none w-auto min-w-[6.5rem] max-w-full px-3 py-2 bg-slate-900 border-slate-800 text-slate-300 text-xs font-medium"
        >
          <option value="ALL">{t('pantry.categoryAll')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {tCategory(c.name)}
            </option>
          ))}
        </Select>

        {groupBy && setGroupBy && (
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="hidden sm:block w-3.5 h-3.5 text-slate-500" />
            <SegmentedControl
              size="sm"
              className="p-0.5 font-semibold"
              value={groupBy}
              onChange={setGroupBy}
              options={groupOptions.map((opt) => ({ value: opt.key, label: opt.label }))}
            />
          </div>
        )}
      </div>
    </div>
  );
};