import React, { useState } from 'react';
import { usePantry } from '../contexts/PantryContext';
import { useLanguage } from '../language/LanguageContext';
import { PantryCard } from '../components/pantry/PantryCard';
import { PantryFilter } from '../components/pantry/PantryFilter';
import { PantryItem } from '../types';
import { QrCode, Plus, Boxes, PackageOpen } from 'lucide-react';

interface PantryPageProps {
  onOpenScanner: (mode?: 'ADD' | 'REMOVE' | 'SEARCH') => void;
  onOpenAddManual: () => void;
  onEditItem: (item: PantryItem) => void;
}

export const PantryPage: React.FC<PantryPageProps> = ({
  onOpenScanner,
  onOpenAddManual,
  onEditItem,
}) => {
  const { items, isLoading } = usePantry();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Pasek Tytułowy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-400" />
            {t('pantry.title')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('pantry.searchPlaceholder')}
          </p>
        </div>

        {/* Przyciski Akcji */}
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

      {/* Pasek Filtrów i Sortowania */}
      <PantryFilter
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenScannerSearch={() => onOpenScanner('SEARCH')}
      />

      {/* Lista / Siatka Produktów */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          {t('common.loading')}
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <PackageOpen className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {t('pantry.emptyFilterTitle')}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {t('pantry.emptyFilterDesc')}
            </p>
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <PantryCard key={item.id} item={item} onEdit={onEditItem} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <PantryCard key={item.id} item={item} onEdit={onEditItem} viewMode="list" />
          ))}
        </div>
      )}
    </div>
  );
};
