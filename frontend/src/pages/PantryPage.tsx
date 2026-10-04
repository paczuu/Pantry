import React, { useMemo, useState } from 'react';
import { usePantry } from '../contexts/PantryContext';
import { useLanguage } from '../language/LanguageContext';
import { PantryCard } from '../components/pantry/PantryCard';
import { PantryFilter, GroupBy } from '../components/pantry/PantryFilter';
import { PantryItem } from '../types';
import { getExpiryStatus } from '../utils/expiry';
import { QrCode, Plus, Boxes, PackageOpen, ChevronDown, ChevronRight } from 'lucide-react';

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

const toneText: Record<Tone, string> = {
  expired: 'text-rose-400',
  warning: 'text-amber-400',
  neutral: 'text-slate-300',
};

export const PantryPage: React.FC<PantryPageProps> = ({
  onOpenScanner,
  onOpenAddManual,
  onEditItem,
}) => {
  const { items, isLoading, stats, expiryWarningDays, resetFilters } = usePantry();
  const { t, tCategory } = useLanguage();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Sumy globalne ze stats (niezależne od aktywnych filtrów)
  const totalActive = stats?.totalActive ?? items.length;
  const expiredCount = stats?.expiredCount || 0;
  const expiringCount = stats?.expiring3DaysCount || 0;
  const attentionCount = expiredCount + expiringCount;

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
        { key: 'expired', label: t('pantry.statusExpired'), tone: 'expired' as Tone, items: expired },
        { key: 'warning', label: t('pantry.statusWarning'), tone: 'warning' as Tone, items: warning },
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

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderItems = (list: PantryItem[]) =>
    viewMode === 'grid' ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 items-stretch">
        {list.map((item) => (
          <PantryCard key={item.id} item={item} onEdit={onEditItem} viewMode="grid" />
        ))}
      </div>
    ) : (
      <div className="space-y-2.5">
        {list.map((item) => (
          <PantryCard key={item.id} item={item} onEdit={onEditItem} viewMode="list" />
        ))}
      </div>
    );

  // Spiżarnia faktycznie pusta (a nie tylko puste wyniki filtrów)
  const isPantryEmpty = totalActive === 0 && items.length === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Nagłówek: tytuł + podsumowanie + akcje */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-400" />
            {t('pantry.title')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalActive} {t('common.items')}
            {attentionCount > 0 && (
              <>
                {' · '}
                <span
                  className={`font-semibold ${expiredCount > 0 ? 'text-rose-400' : 'text-amber-400'}`}
                >
                  {attentionCount} {t('pantry.needAttention')}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onOpenScanner('ADD')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all"
          >
            <QrCode className="w-4 h-4" />
            {t('pantry.scanProduct')}
          </button>
          <button
            onClick={onOpenAddManual}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-semibold text-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('pantry.addProduct')}
          </button>
        </div>
      </div>

      {/* Wszystkie filtry, sortowanie, widok i grupowanie w jednym miejscu */}
      <PantryFilter
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenScannerSearch={() => onOpenScanner('SEARCH')}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
      />

      {/* Zawartość */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">{t('common.loading')}</div>
      ) : isPantryEmpty ? (
        <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto">
            <PackageOpen className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">{t('pantry.emptyTitle')}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">{t('pantry.emptyDesc')}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenScanner('ADD')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg"
            >
              {t('pantry.scanProduct')}
            </button>
            <button
              onClick={onOpenAddManual}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all"
            >
              {t('pantry.addProduct')}
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-6 space-y-3">
          <h3 className="text-base font-bold text-white">{t('pantry.emptyFilterTitle')}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{t('pantry.emptyFilterDesc')}</p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all"
          >
            {t('pantry.resetFilters')}
          </button>
        </div>
      ) : groupBy === 'none' ? (
        renderItems(items)
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.key);
            return (
              <section key={group.key} className="space-y-2.5">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center gap-2 text-left"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                  <h3 className={`text-sm font-extrabold tracking-tight ${toneText[group.tone]}`}>
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