import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { api, BarcodeProviderKey, BarcodeSourceConfig } from '../../services/api';
import { User, UserRole, NavItemConfig } from '../../types';
import { InstallPwaModal } from '../common/InstallPwaModal';
import {
  DEFAULT_NAV_ITEMS,
  loadNavConfig,
  persistNavConfig,
} from '../../utils/navConfig';
import { clampExpiryWarningDays } from '../../utils/expiryWarning';
import {
  ACCENT_THEMES,
  AccentThemeId,
  applyAccentTheme,
  getStoredAccentTheme,
} from '../../utils/accentTheme';
import {
  Users,
  Copy,
  ShieldCheck,
  Trash2,
  Tag,
  Download,
  Home,
  KeyRound,
  Smartphone,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  Sliders,
  Database,
  Plus,
  Save,
  Globe2,
  Clock,
  Palette,
  PencilLine,
} from 'lucide-react';

const BARCODE_PROVIDER_OPTIONS: Array<{
  provider: BarcodeProviderKey;
  label: string;
  description: string;
  supportsCountry: boolean;
}> = [
  {
    provider: 'OPEN_FOOD_FACTS',
    label: 'Open Food Facts',
    description: 'Żywność, napoje i dane żywieniowe.',
    supportsCountry: true,
  },
  {
    provider: 'OPEN_BEAUTY_FACTS',
    label: 'Open Beauty Facts',
    description: 'Kosmetyki i produkty pielęgnacyjne.',
    supportsCountry: false,
  },
  {
    provider: 'OPEN_PRODUCTS_FACTS',
    label: 'Open Products Facts',
    description: 'Pozostałe produkty konsumenckie.',
    supportsCountry: false,
  },
  {
    provider: 'OPEN_PET_FOOD_FACTS',
    label: 'Open Pet Food Facts',
    description: 'Karma i produkty dla zwierząt.',
    supportsCountry: false,
  },
];

const COUNTRY_OPTIONS = [
  { code: 'pl', label: 'Polska' },
  { code: 'de', label: 'Niemcy' },
  { code: 'cz', label: 'Czechy' },
  { code: 'sk', label: 'Słowacja' },
  { code: 'fr', label: 'Francja' },
  { code: 'es', label: 'Hiszpania' },
  { code: 'it', label: 'Włochy' },
  { code: 'uk', label: 'Wielka Brytania' },
  { code: 'us', label: 'USA' },
  { code: 'world', label: 'World / globalna' },
];

const getBarcodeSourceLabel = (source: BarcodeSourceConfig): string => {
  const provider = BARCODE_PROVIDER_OPTIONS.find(
    (option) => option.provider === source.provider
  );

  if (!provider) return source.provider;

  if (provider.supportsCountry) {
    const country = COUNTRY_OPTIONS.find(
      (option) => option.code === source.countryCode
    );

    return `${provider.label} — ${
      country?.label || source.countryCode.toUpperCase()
    }`;
  }

  return provider.label;
};

export const HouseholdSettingsView: React.FC = () => {
  const { user, isAdmin, refreshUser, joinHousehold } = useAuth();
  const { categories, refreshSettings, refreshStats, expiryWarningDays } =
    usePantry();
  const { showToast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const [householdNameInput, setHouseholdNameInput] = useState(
    user?.household?.name || ''
  );
  const [householdNameSaving, setHouseholdNameSaving] = useState(false);

  const [warningDaysInput, setWarningDaysInput] = useState(
    String(expiryWarningDays)
  );
  const [warningDaysSaving, setWarningDaysSaving] = useState(false);

  const [accentTheme, setAccentTheme] = useState<AccentThemeId>(() =>
    getStoredAccentTheme()
  );

  // Źródła EAN
  const [barcodeSources, setBarcodeSources] = useState<BarcodeSourceConfig[]>(
    []
  );
  const [barcodeSourcesLoading, setBarcodeSourcesLoading] = useState(true);
  const [barcodeSourcesSaving, setBarcodeSourcesSaving] = useState(false);

  // Nawigacja
  const [navConfig, setNavConfig] = useState<NavItemConfig[]>(() =>
    loadNavConfig()
  );

  const saveNavConfig = (newConfig: NavItemConfig[]) => {
    setNavConfig(newConfig);
    persistNavConfig(newConfig);
    showToast('Zapisano układ paska nawigacyjnego.', 'success');
  };

  const toggleNavVisibility = (id: string) => {
    const updated = navConfig.map((item) =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );

    saveNavConfig(updated);
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const sorted = [...navConfig].sort((a, b) => a.order - b.order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    const updated = sorted.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    saveNavConfig(updated);
  };

  const resetNavConfig = () => {
    saveNavConfig(DEFAULT_NAV_ITEMS);
  };

  const handleAccentThemeChange = (themeId: AccentThemeId) => {
    setAccentTheme(themeId);
    applyAccentTheme(themeId);

    const selectedTheme = ACCENT_THEMES.find((theme) => theme.id === themeId);

    showToast(
      `Ustawiono kolor aplikacji: ${selectedTheme?.label || themeId}.`,
      'success'
    );
  };

  const resetAccentTheme = () => {
    handleAccentThemeChange('emerald');
  };

  const fetchBarcodeSources = async () => {
    try {
      setBarcodeSourcesLoading(true);
      const res = await api.getBarcodeSources();

      setBarcodeSources(
        [...(res.sources || [])].sort((a, b) => a.priority - b.priority)
      );
    } catch (e: any) {
      console.error('Błąd pobierania źródeł EAN:', e);
      showToast(e.message || 'Nie udało się pobrać źródeł EAN.', 'error');
    } finally {
      setBarcodeSourcesLoading(false);
    }
  };

  const normalizeBarcodePriorities = (
    sources: BarcodeSourceConfig[]
  ): BarcodeSourceConfig[] =>
    sources.map((source, index) => ({
      ...source,
      priority: index + 1,
    }));

  const toggleBarcodeSource = (index: number) => {
    setBarcodeSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index
          ? { ...source, enabled: !source.enabled }
          : source
      )
    );
  };

  const moveBarcodeSource = (index: number, direction: 'up' | 'down') => {
    setBarcodeSources((current) => {
      const next = [...current];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) return current;

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

      return normalizeBarcodePriorities(next);
    });
  };

  const removeBarcodeSource = (index: number) => {
    setBarcodeSources((current) =>
      normalizeBarcodePriorities(
        current.filter((_, sourceIndex) => sourceIndex !== index)
      )
    );
  };

  const addBarcodeSource = () => {
    setBarcodeSources((current) => {
      const candidates: BarcodeSourceConfig[] = [
        {
          provider: 'OPEN_FOOD_FACTS',
          countryCode: 'pl',
          enabled: true,
          priority: current.length + 1,
        },
        {
          provider: 'OPEN_FOOD_FACTS',
          countryCode: 'world',
          enabled: true,
          priority: current.length + 1,
        },
        {
          provider: 'OPEN_BEAUTY_FACTS',
          countryCode: 'world',
          enabled: true,
          priority: current.length + 1,
        },
        {
          provider: 'OPEN_PRODUCTS_FACTS',
          countryCode: 'world',
          enabled: true,
          priority: current.length + 1,
        },
        {
          provider: 'OPEN_PET_FOOD_FACTS',
          countryCode: 'world',
          enabled: true,
          priority: current.length + 1,
        },
      ];

      const candidate = candidates.find(
        (option) =>
          !current.some(
            (source) =>
              source.provider === option.provider &&
              source.countryCode === option.countryCode
          )
      );

      if (!candidate) {
        showToast(
          'Masz już podstawowe źródła. Zmień kraj w jednym z wpisów Open Food Facts, aby dodać kolejne.',
          'info'
        );

        return current;
      }

      return normalizeBarcodePriorities([...current, candidate]);
    });
  };

  const updateBarcodeSourceProvider = (
    index: number,
    provider: BarcodeProviderKey
  ) => {
    setBarcodeSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index
          ? {
              ...source,
              provider,
              countryCode:
                provider === 'OPEN_FOOD_FACTS'
                  ? source.countryCode || 'pl'
                  : 'world',
            }
          : source
      )
    );
  };

  const updateBarcodeSourceCountry = (index: number, countryCode: string) => {
    setBarcodeSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index
          ? {
              ...source,
              countryCode,
            }
          : source
      )
    );
  };

  const saveBarcodeSources = async () => {
    try {
      setBarcodeSourcesSaving(true);

      const normalized = normalizeBarcodePriorities(barcodeSources);

      const res = await api.updateBarcodeSources(normalized);

      setBarcodeSources(
        [...(res.sources || [])].sort((a, b) => a.priority - b.priority)
      );

      showToast('Zapisano źródła wyszukiwania EAN.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Nie udało się zapisać źródeł EAN.', 'error');
    } finally {
      setBarcodeSourcesSaving(false);
    }
  };

  const resetBarcodeSources = async () => {
    if (
      !window.confirm(
        'Przywrócić domyślne źródła EAN: Open Food Facts PL → World?'
      )
    ) {
      return;
    }

    try {
      setBarcodeSourcesSaving(true);

      const res = await api.resetBarcodeSources();

      setBarcodeSources(
        [...(res.sources || [])].sort((a, b) => a.priority - b.priority)
      );

      showToast('Przywrócono domyślne źródła EAN.', 'success');
    } catch (e: any) {
      showToast(
        e.message || 'Nie udało się przywrócić ustawień EAN.',
        'error'
      );
    } finally {
      setBarcodeSourcesSaving(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.getHouseholdMembers();
      setMembers(res.members || []);
    } catch (e: any) {
      console.error('Błąd pobierania członków:', e);
    }
  };

  useEffect(() => {
    fetchMembers();

    if (isAdmin) {
      fetchBarcodeSources();
    } else {
      setBarcodeSourcesLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    setWarningDaysInput(String(expiryWarningDays));
  }, [expiryWarningDays]);

  useEffect(() => {
    setHouseholdNameInput(user?.household?.name || '');
  }, [user?.household?.name]);

  const handleSaveHouseholdName = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) return;

    const cleanName = householdNameInput.trim();

    if (!cleanName) {
      showToast('Nazwa gospodarstwa nie może być pusta.', 'warning');
      return;
    }

    if (cleanName.length < 2) {
      showToast('Nazwa gospodarstwa musi mieć co najmniej 2 znaki.', 'warning');
      return;
    }

    if (cleanName.length > 60) {
      showToast('Nazwa gospodarstwa może mieć maksymalnie 60 znaków.', 'warning');
      return;
    }

    if (cleanName === user?.household?.name) {
      showToast('Nazwa gospodarstwa nie została zmieniona.', 'info');
      return;
    }

    try {
      setHouseholdNameSaving(true);

      await api.updateHouseholdSettings({
        name: cleanName,
      });

      await refreshUser();

      showToast(
        `Zmieniono nazwę gospodarstwa na "${cleanName}".`,
        'success'
      );
    } catch (e: any) {
      showToast(
        e.message || 'Nie udało się zmienić nazwy gospodarstwa.',
        'error'
      );
    } finally {
      setHouseholdNameSaving(false);
    }
  };

  const handleSaveExpiryWarningDays = async () => {
    const days = clampExpiryWarningDays(warningDaysInput);

    try {
      setWarningDaysSaving(true);

      await api.updateHouseholdSettings({
        expiryWarningDays: days,
      });

      setWarningDaysInput(String(days));

      await refreshUser();
      await refreshStats();

      showToast(
        `Alert o końcu terminu: ${days} ${days === 1 ? 'dzień' : 'dni'}.`,
        'success'
      );
    } catch (e: any) {
      showToast(
        e.message || 'Nie udało się zapisać okresu ważności.',
        'error'
      );
    } finally {
      setWarningDaysSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (user?.household?.inviteCode) {
      navigator.clipboard.writeText(user.household.inviteCode);

      showToast(
        `Skopiowano kod zaproszenia: ${user.household.inviteCode}`,
        'success'
      );
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      await api.updateMemberRole(memberId, newRole);

      showToast('Zaktualizowano uprawnienia domownika.', 'success');

      await fetchMembers();
      await refreshUser();
    } catch (e: any) {
      showToast(e.message || 'Błąd aktualizacji roli.', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (
      window.confirm(
        `Czy na pewno chcesz usunąć użytkownika "${name}" z gospodarstwa?`
      )
    ) {
      try {
        await api.removeMember(memberId);

        showToast('Usunięto członka z gospodarstwa.', 'info');

        await fetchMembers();
      } catch (e: any) {
        showToast(e.message || 'Błąd usuwania członka.', 'error');
      }
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) return;

    try {
      await api.addCategory(newCategoryName.trim());

      showToast(`Dodano kategorię "${newCategoryName}"`, 'success');

      setNewCategoryName('');

      await refreshSettings();
    } catch (e: any) {
      showToast('Błąd dodawania kategorii.', 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno usunąć kategorię "${name}"?`)) {
      try {
        await api.deleteCategory(id);

        showToast('Kategoria usunięta.', 'info');

        await refreshSettings();
      } catch (e: any) {
        showToast('Błąd usuwania kategorii.', 'error');
      }
    }
  };

  const handleJoinOtherHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCodeInput.trim()) return;

    if (
      window.confirm(
        'Dołączenie do innego gospodarstwa spowoduje opuszczenie obecnego. Kontynuować?'
      )
    ) {
      try {
        await joinHousehold(inviteCodeInput.trim());
        setInviteCodeInput('');
      } catch (e) {}
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/settings/backup', '_blank');

    showToast(
      'Pobieranie kopii zapasowej spiżarni...',
      'info'
    );
  };

  const sortedNavItems = [...navConfig].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Nagłówek */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Home className="w-6 h-6 text-emerald-400" />
          Gospodarstwo Domowe i Ustawienia
        </h2>

        <p className="text-xs text-slate-400">
          Zarządzaj domownikami, uprawnieniami, wyglądem aplikacji i konfiguracją gospodarstwa
        </p>
      </div>

      {/* Instalacja Aplikacji */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-emerald-950/40 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-950/60">
            <Smartphone className="w-6 h-6" />
          </div>

          <div>
            <h3 className="font-extrabold text-white text-base">
              Instalacja Aplikacji
            </h3>

            <p className="text-xs text-slate-300">
              Zainstaluj aplikację na telefonie (Android, iOS) lub komputerze,
              aby mieć do niej błyskawiczny dostęp.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsInstallModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 transition-all self-start sm:self-auto shrink-0"
        >
          Sprawdź instrukcję instalacji
        </button>
      </div>

      {/* Kolor aplikacji */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-emerald-400" />
              Kolor aplikacji
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Wybierz główny kolor przycisków, ikon, ramek i elementów interfejsu.
            </p>
          </div>

          {accentTheme !== 'emerald' && (
            <button
              type="button"
              onClick={resetAccentTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                Domyślny
              </span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {ACCENT_THEMES.map((theme) => {
            const selected = accentTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleAccentThemeChange(theme.id)}
                className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                  selected
                    ? 'bg-slate-800 border-white/30 shadow-lg'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl shrink-0 transition-transform ${
                    selected ? 'scale-110' : ''
                  }`}
                  style={{
                    backgroundColor: theme.color,
                    boxShadow: selected
                      ? `0 0 18px ${theme.color}55`
                      : 'none',
                  }}
                />

                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {theme.label}
                  </div>

                  <div className="text-[10px] text-slate-500 truncate">
                    {theme.description}
                  </div>
                </div>

                {selected && (
                  <div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: theme.color,
                      boxShadow: `0 0 8px ${theme.color}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Personalizacja paska */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Personalizacja paska nawigacji
            </h3>

            <p className="text-xs text-slate-400">
              Usuń przyciski z dolnego paska albo zmień ich kolejność.
              Ukryte pozycje nie pojawią się na telefonie.
            </p>
          </div>

          <button
            onClick={resetNavConfig}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Przywróć domyślny układ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              Domyślne
            </span>
          </button>
        </div>

        <div className="space-y-2">
          {sortedNavItems.map((item, index) => {
            if (item.id === 'audit' && !isAdmin) return null;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleNavVisibility(item.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.visible
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-slate-500 bg-slate-900'
                    }`}
                    title={
                      item.visible
                        ? 'Ukryj ten przycisk'
                        : 'Pokaż ten przycisk'
                    }
                  >
                    {item.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                  <span
                    className={`text-sm font-semibold ${
                      item.visible
                        ? 'text-white'
                        : 'text-slate-500 line-through'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveNavItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => moveNavItem(index, 'down')}
                    disabled={index === sortedNavItems.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kategorie */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-cyan-400" />
          Kategorie produktów
        </h3>

        <form
          onSubmit={handleAddCategory}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Wpisz nową kategorię..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
          >
            Dodaj
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
            >
              <span>
                {cat.name}
              </span>

              {categories.length > 1 && (
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="text-slate-500 hover:text-rose-400 ml-1"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Okres ostrzeżenia */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Kończący się termin ważności
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            Pulpit, filtry spiżarni i alerty oznaczają produkty,
            których termin kończy się w podanej liczbie dni.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs font-semibold text-slate-300 shrink-0">
            Liczba dni
          </label>

          <input
            type="number"
            min={1}
            max={90}
            value={warningDaysInput}
            onChange={(e) => setWarningDaysInput(e.target.value)}
            className="w-full sm:w-28 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
          />

          <button
            type="button"
            onClick={handleSaveExpiryWarningDays}
            disabled={warningDaysSaving}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Zapisz
          </button>
        </div>
      </div>

      {/* Członkowie gospodarstwa */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Członkowie gospodarstwa ({members.length})
        </h3>

        <div className="space-y-2.5">
          {members.map((member) => {
            const isMe = member.id === user?.id;
            const isMemberAdmin = member.role === 'ADMIN';

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-sm text-slate-200">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {member.name}

                      {isMe && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          (Ty)
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400">
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && !isMe ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleUpdateRole(
                          member.id,
                          e.target.value as UserRole
                        )
                      }
                      className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="MEMBER">
                        MEMBER
                      </option>

                      <option value="ADMIN">
                        ADMIN
                      </option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                        isMemberAdmin
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isMemberAdmin && (
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      )}

                      {member.role}
                    </span>
                  )}

                  {isAdmin && !isMe && (
                    <button
                      onClick={() =>
                        handleRemoveMember(
                          member.id,
                          member.name
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <>
          {/* Źródła danych EAN */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Źródła wyszukiwania EAN
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Skaner sprawdza źródła od góry do dołu.
                  Produkt dodany ręcznie w aplikacji zawsze ma najwyższy priorytet.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={resetBarcodeSources}
                  disabled={barcodeSourcesSaving}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
                  Domyślne
                </button>

                <button
                  onClick={saveBarcodeSources}
                  disabled={barcodeSourcesSaving || barcodeSourcesLoading}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1.5" />

                  {barcodeSourcesSaving
                    ? 'Zapisywanie...'
                    : 'Zapisz'}
                </button>
              </div>
            </div>

            {barcodeSourcesLoading ? (
              <div className="text-xs text-slate-400 py-3">
                Ładowanie źródeł EAN...
              </div>
            ) : (
              <div className="space-y-2">
                {barcodeSources.map((source, index) => {
                  const providerMeta =
                    BARCODE_PROVIDER_OPTIONS.find(
                      (option) =>
                        option.provider === source.provider
                    );

                  return (
                    <div
                      key={`${source.provider}-${source.countryCode}-${index}`}
                      className={`p-3 rounded-2xl border transition-colors ${
                        source.enabled
                          ? 'bg-slate-800/70 border-slate-700'
                          : 'bg-slate-950/60 border-slate-800 opacity-65'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleBarcodeSource(index)}
                          className={`self-start lg:self-auto px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border ${
                            source.enabled
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-slate-500'
                          }`}
                        >
                          {source.enabled
                            ? 'WŁĄCZONE'
                            : 'WYŁĄCZONE'}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={source.provider}
                              onChange={(e) =>
                                updateBarcodeSourceProvider(
                                  index,
                                  e.target.value as BarcodeProviderKey
                                )
                              }
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                            >
                              {BARCODE_PROVIDER_OPTIONS.map(
                                (option) => (
                                  <option
                                    key={option.provider}
                                    value={option.provider}
                                  >
                                    {option.label}
                                  </option>
                                )
                              )}
                            </select>

                            {providerMeta?.supportsCountry ? (
                              <select
                                value={source.countryCode}
                                onChange={(e) =>
                                  updateBarcodeSourceCountry(
                                    index,
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                              >
                                {COUNTRY_OPTIONS.map(
                                  (country) => (
                                    <option
                                      key={country.code}
                                      value={country.code}
                                    >
                                      {country.label}
                                    </option>
                                  )
                                )}
                              </select>
                            ) : (
                              <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                                <Globe2 className="w-3.5 h-3.5" />
                                Baza globalna
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 mt-1.5">
                            {providerMeta?.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 self-end lg:self-auto">
                          <button
                            onClick={() =>
                              moveBarcodeSource(
                                index,
                                'up'
                              )
                            }
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              moveBarcodeSource(
                                index,
                                'down'
                              )
                            }
                            disabled={
                              index === barcodeSources.length - 1
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              removeBarcodeSource(index)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-slate-600">
                        Priorytet {index + 1}
                      </div>
                    </div>
                  );
                })}

                {barcodeSources.length === 0 && (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-700 text-center text-xs text-slate-500">
                    Brak skonfigurowanych źródeł.
                    Skanowanie będzie korzystało z domyślnego
                    Open Food Facts PL → World.
                  </div>
                )}
              </div>
            )}

            {!barcodeSourcesLoading && (
              <button
                type="button"
                onClick={addBarcodeSource}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-300 text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1.5" />
                Dodaj źródło
              </button>
            )}
          </div>
        </>
      )}

      {/* Gospodarstwo i kod zaproszenia */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-emerald-400">
              Współdzielenie Spiżarni
            </div>

            <h3 className="text-lg font-extrabold text-white">
              {user?.household?.name || 'Moje Gospodarstwo'}
            </h3>

            <p className="text-xs text-slate-300">
              Podaj ten kod domownikowi podczas rejestracji lub dołączania,
              aby wspólnie zarządzać produktami.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-emerald-500/40">
            <span className="font-mono text-xl font-extrabold text-emerald-400 tracking-widest px-2">
              {user?.household?.inviteCode}
            </span>

            <button
              onClick={handleCopyCode}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition-all active:scale-95"
              title="Kopiuj kod zaproszenia"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="pt-4 border-t border-slate-800">
            <form
              onSubmit={handleSaveHouseholdName}
              className="space-y-3"
            >
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <PencilLine className="w-4 h-4 text-emerald-400" />
                  Nazwa gospodarstwa
                </h4>

                <p className="text-[11px] text-slate-400 mt-1">
                  Jako administrator możesz zmienić nazwę widoczną dla wszystkich domowników.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={householdNameInput}
                  onChange={(e) => setHouseholdNameInput(e.target.value)}
                  minLength={2}
                  maxLength={60}
                  placeholder="np. Domowa Spiżarnia"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={
                    householdNameSaving ||
                    !householdNameInput.trim() ||
                    householdNameInput.trim() === user?.household?.name
                  }
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />

                  {householdNameSaving
                    ? 'Zapisywanie...'
                    : 'Zmień nazwę'}
                </button>
              </div>

              <div className="text-[10px] text-slate-500">
                {householdNameInput.length}/60 znaków
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Backup / Zmiana gospodarstwa */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          !isAdmin
            ? 'sm:grid-cols-2'
            : ''
        }`}
      >
        {!isAdmin && (
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Zmień gospodarstwo domowe
            </h4>

            <form
              onSubmit={handleJoinOtherHousehold}
              className="space-y-2"
            >
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) =>
                  setInviteCodeInput(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Wpisz 6-znakowy kod..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono tracking-wider focus:outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                disabled={!inviteCodeInput.trim()}
                className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors disabled:opacity-40"
              >
                Dołącz z kodem
              </button>
            </form>
          </div>
        )}

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            Kopia zapasowa danych
          </h4>

          <p className="text-xs text-slate-400">
            Pobierz pełną bazę spiżarni, list zakupów i notatek w formacie JSON
          </p>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-colors"
          >
            Pobierz plik kopii zapasowej
          </button>
        </div>
      </div>

      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() =>
          setIsInstallModalOpen(false)
        }
      />
    </div>
  );
};