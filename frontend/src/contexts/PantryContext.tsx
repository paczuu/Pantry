import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PantryItem, PantryStats, CategorySetting } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { clampExpiryWarningDays } from '../utils/expiryWarning';

interface FilterState {
  category: string;
  search: string;
  filterByExpiry: string;
  sortBy: string;
}

interface PantryContextType {
  items: PantryItem[];
  stats: PantryStats | null;
  categories: CategorySetting[];
  isLoading: boolean;
  filters: FilterState;
  expiryWarningDays: number;
  setFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
  refreshPantry: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  consumeItem: (id: string, amount?: number, isWasted?: boolean) => Promise<void>;
  barcodeQuickRemove: (params: { barcode?: string; itemId?: string; amount: number; isWasted?: boolean }) => Promise<any>;
  deleteItem: (id: string) => Promise<void>;
}

const defaultFilters: FilterState = {
  category: 'ALL',
  search: '',
  filterByExpiry: 'ALL',
  sortBy: 'expiry_asc',
};

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast, playBeep, vibrate } = useToast();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [stats, setStats] = useState<PantryStats | null>(null);
  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const expiryWarningDays = clampExpiryWarningDays(
    stats?.expiryWarningDays ?? user?.household?.expiryWarningDays
  );

  const refreshSettings = useCallback(async () => {
    if (!user?.householdId) return;
    try {
      const catsRes = await api.getCategories();
      setCategories(catsRes.categories || []);
    } catch (e) {
      console.error('Błąd pobierania kategorii:', e);
    }
  }, [user?.householdId]);

  const refreshStats = useCallback(async () => {
    if (!user?.householdId) return;
    try {
      const statsData = await api.getPantryStats();
      setStats(statsData);
    } catch (e) {
      console.error('Błąd pobierania statystyk:', e);
    }
  }, [user?.householdId]);

  const refreshPantry = useCallback(async () => {
    if (!user?.householdId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.getPantryItems({
        category: filters.category !== 'ALL' ? filters.category : undefined,
        search: filters.search || undefined,
        filterByExpiry: filters.filterByExpiry !== 'ALL' ? filters.filterByExpiry : undefined,
        sortBy: filters.sortBy,
      });
      setItems(data.items || []);
    } catch (error: any) {
      console.error('Błąd pobierania spiżarni:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.householdId, filters]);

  useEffect(() => {
    if (user?.householdId) {
      refreshPantry();
      refreshStats();
      refreshSettings();
    }
  }, [user?.householdId, refreshPantry, refreshStats, refreshSettings]);

  const setFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const consumeItem = async (id: string, amount: number = 1, isWasted: boolean = false) => {
    try {
      const res = await api.consumePantryItem(id, amount, isWasted);
      showToast(res.message, 'success');
      playBeep(600, 'sine', 0.1);
      vibrate(40);
      await Promise.all([refreshPantry(), refreshStats()]);
    } catch (error: any) {
      showToast(error.message || 'Błąd zużywania produktu.', 'error');
      throw error;
    }
  };

  const barcodeQuickRemove = async (params: {
    barcode?: string;
    itemId?: string;
    amount: number;
    isWasted?: boolean;
  }) => {
    try {
      const res = await api.barcodeQuickRemove(params);
      showToast(res.message || 'Usunięto produkt kodem EAN.', 'success');
      playBeep(700, 'sine', 0.15);
      vibrate([40, 30, 40]);
      await Promise.all([refreshPantry(), refreshStats()]);
      return res;
    } catch (error: any) {
      showToast(error.message || 'Błąd szybkiego usuwania kodem.', 'error');
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await api.deletePantryItem(id);
      showToast(res.message, 'info');
      await Promise.all([refreshPantry(), refreshStats()]);
    } catch (error: any) {
      showToast(error.message || 'Błąd usuwania produktu.', 'error');
      throw error;
    }
  };

  return (
    <PantryContext.Provider
      value={{
        items,
        stats,
        categories,
        isLoading,
        filters,
        expiryWarningDays,
        setFilter,
        resetFilters,
        refreshPantry,
        refreshStats,
        refreshSettings,
        consumeItem,
        barcodeQuickRemove,
        deleteItem,
      }}
    >
      {children}
    </PantryContext.Provider>
  );
};

export const usePantry = () => {
  const context = useContext(PantryContext);
  if (!context) {
    throw new Error('usePantry must be used within PantryProvider');
  }
  return context;
};
