import React, { useState } from 'react';
import { usePantry } from '../../contexts/PantryContext';
import { useLanguage } from '../../language/LanguageContext';
import { FieldLabel, SearchInput, Select } from '../ui/FormControls';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../../utils/cn';
import {
  LayoutGrid,
  List,
  Clock,
  AlertCircle,
  PackageOpen,
  ScanBarcode,
  Boxes,
  SlidersHorizontal,
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

const DEFAULT_SORT = 'name_asc';

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

  const [showPanel, setShowPanel] = useState(false);

  const toggleExpiry = (value: string) =>
    setFilter('filterByExpiry', filters.filterByExpiry === value ? 'ALL' : value);

  const expiredCount = stats?.expiredCount || 0;
  const expiringCount = stats?.expiring3DaysCount || 0;
  const openedCount = stats?.openedCount || 0;

  const warningUnit = en ? 'd' : expiryWarningDays === 1 ? 'dzień' : 'dni';

  // Category and sorting live in the panel; the badge tells how many of them differ from the defaults
  const panelActiveCount = (filters.category !== 'ALL' ? 1 : 0) + (filters.sortBy !== DEFAULT_SORT ? 1 : 0);

  const groupOptions: { key: GroupBy; label: string }[] = [
    { key: 'category', label: t('pantry.groupCategory') },
    { key: 'status', label: t('pantry.groupStatus') },
    { key: 'none', label: t('pantry.groupNone') },
  ];

  return (
    <div className="space-y-3">
      {/* Row 1: search, filters panel toggle, view (grid/list) */}
      <div className="flex items-center gap-2">
        <SearchInput
          wrapperClassName="flex-1 min-w-0"
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

        <button
          type="button"
          onClick={() => setShowPanel((open) => !open)}
          aria-expanded={showPanel}
          title={t('pantry.filters')}
          aria-label={t('pantry.filters')}
          className={cn(
            'relative shrink-0 flex items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-colors',
            showPanel || panelActiveCount > 0
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">{t('pantry.filters')}</span>
          {panelActiveCount > 0 && (
            <span className="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-extrabold flex items-center justify-center max-sm:absolute max-sm:-top-1.5 max-sm:-right-1.5">
              {panelActiveCount}
            </span>
          )}
        </button>

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

      {/* Panel: category, sorting, grouping */}
      {showPanel && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div>
            <FieldLabel>{t('pantry.groupCategory')}</FieldLabel>
            <Select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="ALL">{t('pantry.categoryAll')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {tCategory(c.name)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <FieldLabel>{t('pantry.sortBy')}</FieldLabel>
            <Select value={filters.sortBy} onChange={(e) => setFilter('sortBy', e.target.value)}>
              <option value="name_asc">{t('pantry.sortNameAsc')}</option>
              <option value="name_desc">{t('pantry.sortNameDesc')}</option>
              <option value="expiry_asc">{t('pantry.sortExpiryAsc')}</option>
              <option value="expiry_desc">{t('pantry.sortExpiryDesc')}</option>
              <option value="quantity_desc">{t('pantry.sortQuantityDesc')}</option>
              <option value="created_desc">{t('pantry.sortNewest')}</option>
            </Select>
          </div>

          {groupBy && setGroupBy && (
            <div>
              <FieldLabel>{t('pantry.groupBy')}</FieldLabel>
              <SegmentedControl
                fill
                className="rounded-xl bg-slate-800 border-slate-700"
                value={groupBy}
                onChange={setGroupBy}
                options={groupOptions.map((opt) => ({ value: opt.key, label: opt.label }))}
              />
            </div>
          )}
        </div>
      )}

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
    </div>
  );
};
