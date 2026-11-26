import React, { useMemo } from 'react';
import { QrCode, Plus, Boxes, PackageOpen, ChevronDown, ChevronRight, FilterX } from 'lucide-react';
import { usePantry } from '../contexts/PantryContext';
import { useLanguage } from '../language/LanguageContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { PantryCard } from '../components/pantry/PantryCard';
import { PantryFilter, GroupBy } from '../components/pantry/PantryFilter';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Panel';
import { PageHeader } from '../components/ui/PageHeader';
import { PantryItem } from '../types';
import { getExpiryStatus } from '../utils/expiry';
import { cn } from '../utils/cn';

interface PantryPageProps {
  onOpenScanner: (mode?: 'ADD' | 'REMOVE' | 'SEARCH') => void;
  onOpenAddManual: () => void;
  onEditItem: (item: PantryItem) => void;
}

type Tone = 'expired' | 'warning' | 'neutral';

interface Group {
  key: string;
  label: string;
  tone: Tone;
  items: PantryItem[];
}

const TONE_TEXT: Record<Tone, string> = {
  expired: 'text-rose-400',
  warning: 'text-amber-400',
  neutral: 'text-slate-300',
};

const GROUP_OPTIONS: GroupBy[] = ['category', 'status', 'none'];

/** Most overdue / soonest to expire first. */
const byExpiry = (a: PantryItem, b: PantryItem) =>
  new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime();

export const PantryPage: React.FC<PantryPageProps> = ({ onOpenScanner, onOpenAddManual, onEditItem }) => {
  const { items, isLoading, stats, expiryWarningDays, filters, resetFilters } = usePantry();
  const { t, tCategory } = useLanguage();

  // View preferences are remembered on this device
  const [storedView, setViewMode] = usePersistentState<string>('pantry_view_mode', 'list');
  const [storedGroup, setGroupBy] = usePersistentState<string | null>('pantry_group_by', null);
  const [collapsedKeys, setCollapsedKeys] = usePersistentState<string[]>('pantry_collapsed_groups', []);
  const collapsed = useMemo(() => new Set(collapsedKeys), [collapsedKeys]);

  // Global totals come from `stats` so they do not depend on the active filters
  const totalActive = stats?.totalActive ?? items.length;
  const expiredCount = stats?.expiredCount || 0;
  const expiringCount = stats?.expiring3DaysCount || 0;
  const attentionCount = expiredCount + expiringCount;

  const viewMode: 'grid' | 'list' = storedView === 'grid' ? 'grid' : 'list';
  // Until the user picks a grouping, show what needs attention first when something does
  const groupBy: GroupBy = GROUP_OPTIONS.includes(storedGroup as GroupBy)
    ? (storedGroup as GroupBy)
    : attentionCount > 0
    ? 'status'
    : 'category';

  const hasActiveFilters = filters.search !== '' || filters.category !== 'ALL' || filters.filterByExpiry !== 'ALL';

  const groups: Group[] = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', tone: 'neutral', items }];
    }

    if (groupBy === 'status') {
      const expired: PantryItem[] = [];
      const warning: PantryItem[] = [];
      const rest: PantryItem[] = [];
      for (const item of items) {
        const s = getExpiryStatus(item.expiryDate, expiryWarningDays);
        if (s === 'expired') expired.push(item);
        else if (s === 'warning') warning.push(item);
        else rest.push(item);
      }
      return [
        { key: 'expired', label: t('pantry.statusExpired'), tone: 'expired' as Tone, items: expired.sort(byExpiry) },
        { key: 'warning', label: t('pantry.statusWarning'), tone: 'warning' as Tone, items: warning.sort(byExpiry) },
        { key: 'rest', label: t('pantry.statusOk'), tone: 'neutral' as Tone, items: rest },
      ].filter((g) => g.items.length > 0);
    }

    // groupBy === 'category'
    const map = new Map<string, PantryItem[]>();
    for (const item of items) {
      const key = item.category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries())
      .map(([key, list]) => ({
        key: `cat-${key}`,
        label: tCategory(key),
        tone: 'neutral' as Tone,
        items: list,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, groupBy, expiryWarningDays, t, tCategory]);

  const toggleGroup = (key: string) =>
    setCollapsedKeys(collapsed.has(key) ? collapsedKeys.filter((k) => k !== key) : [...collapsedKeys, key]);

  const renderItems = (list: PantryItem[]) =>
    viewMode === 'grid' ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 items-stretch">
        {list.map((item) => (
          <PantryCard key={item.id} item={item} onEdit={onEditItem} viewMode="grid" />
        ))}
      </div>
    ) : (
      // Phones: rows without gaps (separated by lines); from `sm` up: cards with a gap
      <div className="flex flex-col sm:gap-2.5">
        {list.map((item) => (
          <PantryCard key={item.id} item={item} onEdit={onEditItem} viewMode="list" />
        ))}
      </div>
    );

  // The pantry is really empty (as opposed to a filter that matches nothing)
  const isPantryEmpty = totalActive === 0 && items.length === 0;
  const showResultsBar = !isLoading && !isPantryEmpty && hasActiveFilters;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <PageHeader
        icon={<Boxes />}
        title={t('pantry.title')}
        subtitle={
          <>
            {totalActive} {t('common.items')}
            {attentionCount > 0 && (
              <>
                {' · '}
                <span className={cn('font-semibold', expiredCount > 0 ? 'text-rose-400' : 'text-amber-400')}>
                  {attentionCount} {t('pantry.needAttention')}
                </span>
              </>
            )}
          </>
        }
        actions={
          <>
            <Button variant="primary" icon={<QrCode className="w-4 h-4" />} collapseLabel onClick={() => onOpenScanner('ADD')}>
              {t('pantry.scanProduct')}
            </Button>
            <Button icon={<Plus className="w-4 h-4" />} collapseLabel onClick={onOpenAddManual}>
              {t('pantry.addProduct')}
            </Button>
          </>
        }
      />

      <PantryFilter
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenScannerSearch={() => onOpenScanner('SEARCH')}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
      />

      {/* Result count and clear filters */}
      {showResultsBar && (
        <div className="flex items-center justify-between gap-3 -mt-2 text-xs">
          <span className="text-slate-400 min-w-0 truncate">
            {hasActiveFilters &&
              t('pantry.resultsCount').replace('{shown}', String(items.length)).replace('{total}', String(totalActive))}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" icon={<FilterX className="w-3.5 h-3.5" />} onClick={resetFilters}>
                {t('pantry.resetFilters')}
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">{t('common.loading')}</div>
      ) : isPantryEmpty ? (
        <EmptyState
          className="py-20 space-y-4"
          icon={
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto">
              <PackageOpen className="w-8 h-8 text-emerald-400" />
            </div>
          }
          title={t('pantry.emptyTitle')}
          description={t('pantry.emptyDesc')}
          actions={
            <>
              <Button variant="primary" onClick={() => onOpenScanner('ADD')}>
                {t('pantry.scanProduct')}
              </Button>
              <Button onClick={onOpenAddManual}>{t('pantry.addProduct')}</Button>
            </>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('pantry.emptyFilterTitle')}
          description={t('pantry.emptyFilterDesc')}
          actions={<Button onClick={resetFilters}>{t('pantry.resetFilters')}</Button>}
        />
      ) : groupBy === 'none' ? (
        renderItems(items)
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.key);
            return (
              <section key={group.key} className="space-y-1.5">
                {/* Sticks under the top bar while its group scrolls past */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="sticky top-[var(--header-h,4.25rem)] z-10 w-full flex items-center gap-2 text-left py-2 bg-slate-950"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                  <h3 className={cn('text-sm font-extrabold tracking-tight', TONE_TEXT[group.tone])}>
                    {group.label}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                    {group.items.length}
                  </span>
                  <span className="flex-1 border-t border-slate-800/80 ml-1" />
                </button>

                {!isCollapsed && renderItems(group.items)}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
