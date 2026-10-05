import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { api, BarcodeProviderKey, BarcodeSourceConfig } from '../../services/api';
import { User, UserRole, NavItemConfig, SystemUser, SystemHousehold } from '../../types';
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
  Upload,
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
  Shield,
  UserCog,
  Building2,
  Crown,
  Languages,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Stałe                                                                     */
/* -------------------------------------------------------------------------- */

const BARCODE_PROVIDER_OPTIONS: Array<{
  provider: BarcodeProviderKey;
  label: string;
  description: { pl: string; en: string };
  supportsCountry: boolean;
}> = [
  {
    provider: 'OPEN_FOOD_FACTS',
    label: 'Open Food Facts',
    description: {
      pl: 'Żywność, napoje i dane żywieniowe.',
      en: 'Food, beverages, and nutrition data.',
    },
    supportsCountry: true,
  },
  {
    provider: 'OPEN_BEAUTY_FACTS',
    label: 'Open Beauty Facts',
    description: {
      pl: 'Kosmetyki i produkty pielęgnacyjne.',
      en: 'Cosmetics and personal care products.',
    },
    supportsCountry: false,
  },
  {
    provider: 'OPEN_PRODUCTS_FACTS',
    label: 'Open Products Facts',
    description: {
      pl: 'Pozostałe produkty konsumenckie.',
      en: 'Other consumer goods & items.',
    },
    supportsCountry: false,
  },
  {
    provider: 'OPEN_PET_FOOD_FACTS',
    label: 'Open Pet Food Facts',
    description: {
      pl: 'Karma i produkty dla zwierząt.',
      en: 'Pet food and animal supplies.',
    },
    supportsCountry: false,
  },
];

const COUNTRY_OPTIONS = [
  { code: 'pl', label: { pl: 'Polska', en: 'Poland' } },
  { code: 'de', label: { pl: 'Niemcy', en: 'Germany' } },
  { code: 'cz', label: { pl: 'Czechy', en: 'Czech Republic' } },
  { code: 'sk', label: { pl: 'Słowacja', en: 'Slovakia' } },
  { code: 'fr', label: { pl: 'Francja', en: 'France' } },
  { code: 'es', label: { pl: 'Hiszpania', en: 'Spain' } },
  { code: 'it', label: { pl: 'Włochy', en: 'Italy' } },
  { code: 'uk', label: { pl: 'Wielka Brytania', en: 'United Kingdom' } },
  { code: 'us', label: { pl: 'USA', en: 'USA' } },
  { code: 'world', label: { pl: 'World / globalna', en: 'World / global' } },
];

type SectionId =
  | 'appearance'
  | 'navigation'
  | 'install'
  | 'general'
  | 'members'
  | 'categories'
  | 'sources'
  | 'backup'
  | 'sysHouseholds'
  | 'sysUsers';

type SectionGroup = 'app' | 'household' | 'system';

/* -------------------------------------------------------------------------- */
/*  Małe komponenty układu                                                    */
/* -------------------------------------------------------------------------- */

/** Karta grupująca wiersze ustawień (wiersze rozdzielone cienką linią). */
const SettingsCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`rounded-3xl bg-slate-900/80 border border-slate-800 divide-y divide-slate-800 ${className}`}
  >
    {children}
  </div>
);

/** Pojedynczy wiersz: opis po lewej, kontrolka po prawej (na mobile pod spodem). */
const SettingsRow: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, description, icon, children }) => (
  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex items-start gap-3 min-w-0">
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">
        <div className="text-sm font-bold text-white">{title}</div>
        {description && (
          <div className="text-xs text-slate-400 mt-0.5">{description}</div>
        )}
      </div>
    </div>
    {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
  </div>
);

/** Pełnoszerokościowy blok wewnątrz karty (listy, siatki). */
const SettingsBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 sm:p-5 space-y-3">{children}</div>
);

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const isAdminRole = role === 'ADMIN';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 ${
        isAdminRole
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'bg-slate-700 text-slate-300'
      }`}
    >
      {isAdminRole && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
      {role}
    </span>
  );
};

const useIsDesktop = () => {
  const query = '(min-width: 768px)';

  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = () => setMatches(media.matches);

    handler();
    media.addEventListener('change', handler);

    return () => media.removeEventListener('change', handler);
  }, []);

  return matches;
};

/* -------------------------------------------------------------------------- */
/*  Główny komponent                                                          */
/* -------------------------------------------------------------------------- */

export const HouseholdSettingsView: React.FC = () => {
  const { user, isAdmin, refreshUser, joinHousehold } = useAuth();
  const { categories, refreshSettings, refreshStats, expiryWarningDays } = usePantry();
  const { showToast } = useToast();
  const { language, setLanguage, t, tCategory } = useLanguage();

  const L = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const isDesktop = useIsDesktop();

  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const [members, setMembers] = useState<User[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteTimeLeft, setInviteTimeLeft] = useState(0);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [backupRestoring, setBackupRestoring] = useState(false);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [systemHouseholds, setSystemHouseholds] = useState<SystemHousehold[]>([]);
  const [systemLoading, setSystemLoading] = useState(false);
  const [newSystemHouseholdName, setNewSystemHouseholdName] = useState('');

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
  const [barcodeSources, setBarcodeSources] = useState<BarcodeSourceConfig[]>([]);
  const [barcodeSourcesLoading, setBarcodeSourcesLoading] = useState(true);
  const [barcodeSourcesSaving, setBarcodeSourcesSaving] = useState(false);

  // Nawigacja
  const [navConfig, setNavConfig] = useState<NavItemConfig[]>(() =>
    loadNavConfig()
  );

  /* ------------------------------ Nawigacja -------------------------------- */

  const saveNavConfig = (newConfig: NavItemConfig[]) => {
    setNavConfig(newConfig);
    persistNavConfig(newConfig);
    showToast(t('settings.navBarSavedToast'), 'success');
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

  /* -------------------------------- Motyw ---------------------------------- */

  const handleAccentThemeChange = (themeId: AccentThemeId) => {
    setAccentTheme(themeId);
    applyAccentTheme(themeId);

    const selectedTheme = ACCENT_THEMES.find((theme) => theme.id === themeId);
    const themeName = selectedTheme
      ? selectedTheme.label[language] || selectedTheme.label.pl
      : themeId;

    showToast(`${t('settings.accentThemeSaved')} ${themeName}.`, 'success');
  };

  const resetAccentTheme = () => {
    handleAccentThemeChange('emerald');
  };

  /* ------------------------------ Źródła EAN ------------------------------- */

  const fetchBarcodeSources = async () => {
    try {
      setBarcodeSourcesLoading(true);
      const res = await api.getBarcodeSources();

      setBarcodeSources(
        [...(res.sources || [])].sort((a, b) => a.priority - b.priority)
      );
    } catch (e: any) {
      console.error('Błąd pobierania źródeł EAN:', e);
      showToast(
        e.message ||
          (language === 'pl'
            ? 'Nie udało się pobrać źródeł EAN.'
            : 'Failed to fetch EAN sources.'),
        'error'
      );
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
        sourceIndex === index ? { ...source, enabled: !source.enabled } : source
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
        showToast(t('settings.sourcesAlreadyConfigured'), 'info');
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
        sourceIndex === index ? { ...source, countryCode } : source
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

      showToast(t('settings.sourcesSaved'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setBarcodeSourcesSaving(false);
    }
  };

  const resetBarcodeSources = async () => {
    if (!window.confirm(t('settings.sourcesResetConfirm'))) {
      return;
    }

    try {
      setBarcodeSourcesSaving(true);
      const res = await api.resetBarcodeSources();

      setBarcodeSources(
        [...(res.sources || [])].sort((a, b) => a.priority - b.priority)
      );

      showToast(t('settings.sourcesResetSuccess'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setBarcodeSourcesSaving(false);
    }
  };

  /* ------------------------------- Członkowie ------------------------------ */

  const fetchMembers = async () => {
    try {
      const res = await api.getHouseholdMembers();
      setMembers(res.members || []);
    } catch (e: any) {
      console.error('Błąd pobierania członków:', e);
    }
  };

  /* -------------------------------- Efekty --------------------------------- */

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

  useEffect(() => {
    if (!isAdmin) return;

    const expiresAt = (user?.household as any)?.inviteCodeExpiresAt;

    if (!expiresAt) {
      setInviteTimeLeft(0);
      return;
    }

    const updateTimeLeft = () => {
      const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setInviteTimeLeft(Math.ceil(remaining / 1000));
    };

    updateTimeLeft();

    const interval = window.setInterval(updateTimeLeft, 1000);

    return () => window.clearInterval(interval);
  }, [isAdmin, (user?.household as any)?.inviteCodeExpiresAt]);

  useEffect(() => {
    if (user?.isSystemAdmin) {
      fetchSystemAdminData();
    }
  }, [user?.isSystemAdmin]);

  /* ------------------------------ Gospodarstwo ----------------------------- */

  const handleGenerateInviteCode = async () => {
    try {
      const res = await api.generateHouseholdInviteCode();

      await refreshUser();
      await navigator.clipboard.writeText(res.inviteCode);

      showToast(t('settings.inviteCodeGenerated'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleSaveHouseholdName = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) return;

    const cleanName = householdNameInput.trim();

    if (!cleanName) {
      showToast(t('settings.householdNameEmptyError'), 'warning');
      return;
    }

    if (cleanName.length < 2) {
      showToast(t('settings.householdNameShortError'), 'warning');
      return;
    }

    if (cleanName.length > 60) {
      showToast(t('settings.householdNameLongError'), 'warning');
      return;
    }

    if (cleanName === user?.household?.name) {
      showToast(t('settings.householdNameUnchanged'), 'info');
      return;
    }

    try {
      setHouseholdNameSaving(true);

      await api.updateHouseholdSettings({
        name: cleanName,
      });

      await refreshUser();

      showToast(
        language === 'pl'
          ? `Zmieniono nazwę gospodarstwa na "${cleanName}".`
          : `Household name changed to "${cleanName}".`,
        'success'
      );
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
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
        `${t('settings.warningDaysSaved')} ${days} ${
          days === 1 ? t('settings.daySingular') : t('settings.daysPlural')
        }.`,
        'success'
      );
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setWarningDaysSaving(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      await api.updateMemberRole(memberId, newRole);

      showToast(t('settings.roleUpdatedToast'), 'success');

      await fetchMembers();
      await refreshUser();
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (window.confirm(t('settings.kickMemberConfirm').replace('{name}', name))) {
      try {
        await api.removeMember(memberId);

        showToast(t('settings.memberRemovedToast'), 'info');

        await fetchMembers();
      } catch (e: any) {
        showToast(e.message || t('common.error'), 'error');
      }
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) return;

    try {
      await api.addCategory(newCategoryName.trim());

      showToast(
        `${t('settings.categoryAddedToast')} "${newCategoryName}"`,
        'success'
      );

      setNewCategoryName('');
      await refreshSettings();
    } catch (e: any) {
      showToast(t('common.error'), 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (
      window.confirm(
        t('settings.deleteCategoryConfirm').replace('{name}', tCategory(name))
      )
    ) {
      try {
        await api.deleteCategory(id);

        showToast(t('settings.categoryDeletedToast'), 'info');

        await refreshSettings();
      } catch (e: any) {
        showToast(t('common.error'), 'error');
      }
    }
  };

  const handleJoinOtherHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCodeInput.trim()) return;

    if (window.confirm(t('settings.joinConfirm'))) {
      try {
        await joinHousehold(inviteCodeInput.trim());
        setInviteCodeInput('');
      } catch (e) {}
    }
  };

  /* ----------------------------- Kopia zapasowa ---------------------------- */

  const handleDownloadBackup = async () => {
    try {
      const token = localStorage.getItem('spizarnia_token');

      if (!token) {
        showToast(
          language === 'pl'
            ? 'Brak aktywnej sesji. Zaloguj się ponownie.'
            : 'No active session. Please log in again.',
          'error'
        );
        return;
      }

      showToast(t('settings.preparingBackup'), 'info');

      const response = await fetch('/api/settings/backup', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error ||
            data.message ||
            (language === 'pl'
              ? `Błąd pobierania kopii (${response.status})`
              : `Backup download failed (${response.status})`)
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');

      let fileName = `pantry-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

        if (fileNameMatch?.[1]) {
          fileName = fileNameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showToast(t('settings.backupDownloadedToast'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleRestoreBackup = async (file: File) => {
    if (!isAdmin) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast(
        language === 'pl'
          ? 'Wybierz plik kopii zapasowej w formacie JSON.'
          : 'Select a JSON backup file.',
        'error'
      );
      return;
    }

    let backup: unknown;

    try {
      const content = await file.text();
      backup = JSON.parse(content);
    } catch {
      showToast(
        language === 'pl'
          ? 'Wybrany plik nie zawiera poprawnego JSON.'
          : 'Selected file does not contain valid JSON.',
        'error'
      );
      return;
    }

    if (!window.confirm(t('settings.restoreConfirm'))) {
      return;
    }

    try {
      setBackupRestoring(true);

      const res = await api.restoreHouseholdBackup(backup);

      await refreshUser();
      await refreshSettings();
      await refreshStats();
      await fetchMembers();

      showToast(
        t('settings.restoreSuccessToast')
          .replace('{items}', String(res.restored.pantryItems))
          .replace('{lists}', String(res.restored.shoppingLists))
          .replace('{notes}', String(res.restored.notes))
          .replace('{recipes}', String(res.restored.recipes)),
        'success'
      );
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setBackupRestoring(false);
    }
  };

  /* ------------------------------ Panel systemowy -------------------------- */

  const fetchSystemAdminData = async () => {
    if (!user?.isSystemAdmin) return;

    try {
      setSystemLoading(true);

      const [usersRes, householdsRes] = await Promise.all([
        api.getSystemUsers(),
        api.getSystemHouseholds(),
      ]);

      setSystemUsers(usersRes.users || []);
      setSystemHouseholds(householdsRes.households || []);
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setSystemLoading(false);
    }
  };

  const handleCreateSystemHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = newSystemHouseholdName.trim();

    if (name.length < 2) {
      showToast(t('settings.householdNameShortError'), 'error');
      return;
    }

    try {
      const res = await api.createSystemHousehold(name);

      setNewSystemHouseholdName('');
      await fetchSystemAdminData();

      if (res.household.inviteCode) {
        await navigator.clipboard.writeText(res.household.inviteCode).catch(() => {});
      }

      showToast(
        t('settings.householdCreatedToast').replace('{name}', res.household.name),
        'success'
      );
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleSystemUserRoleChange = async (
    targetUser: SystemUser,
    role: UserRole
  ) => {
    try {
      await api.updateSystemUser(targetUser.id, { role });
      await fetchSystemAdminData();
      showToast(t('settings.userRoleChangedToast'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleSystemUserHouseholdChange = async (
    targetUser: SystemUser,
    householdId: string
  ) => {
    try {
      await api.updateSystemUser(targetUser.id, {
        householdId: householdId || null,
      });
      await fetchSystemAdminData();
      showToast(t('settings.userHouseholdChangedToast'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleSystemAdminToggle = async (targetUser: SystemUser) => {
    if (targetUser.isPrimaryAdmin && targetUser.isSystemAdmin) {
      showToast(t('settings.primaryAdminCannotRevoke'), 'info');
      return;
    }

    try {
      await api.updateSystemUser(targetUser.id, {
        isSystemAdmin: !targetUser.isSystemAdmin,
      });

      await fetchSystemAdminData();
      await refreshUser();

      showToast(
        targetUser.isSystemAdmin
          ? t('settings.systemAdminRevokedToast')
          : t('settings.systemAdminGrantedToast'),
        'success'
      );
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleDeleteSystemUser = async (targetUser: SystemUser) => {
    if (targetUser.isPrimaryAdmin) {
      showToast(t('settings.primaryAdminCannotBeDeleted'), 'info');
      return;
    }

    if (
      !window.confirm(
        t('settings.deleteUserConfirm')
          .replace('{name}', targetUser.name)
          .replace('{email}', targetUser.email)
      )
    ) {
      return;
    }

    try {
      await api.deleteSystemUser(targetUser.id);
      await fetchSystemAdminData();
      await fetchMembers();
      showToast(t('settings.userDeletedToast'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  const handleGenerateSystemInvite = async (household: SystemHousehold) => {
    try {
      const res = await api.generateSystemHouseholdInviteCode(household.id);

      await navigator.clipboard.writeText(res.inviteCode).catch(() => {});
      await fetchSystemAdminData();

      showToast(
        t('settings.generateCodeSuccess')
          .replace('{code}', res.inviteCode)
          .replace('{name}', household.name),
        'success'
      );
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    }
  };

  /* -------------------------------------------------------------------------- */
  /*  Definicja sekcji                                                          */
  /* -------------------------------------------------------------------------- */

  const sections: Array<{
    id: SectionId;
    group: SectionGroup;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'appearance',
      group: 'app',
      label: L('Wygląd i język', 'Appearance & language'),
      description: t('settings.personalizationDesc'),
      icon: <Palette className="w-4 h-4" />,
    },
    {
      id: 'navigation',
      group: 'app',
      label: t('settings.navBarTitle'),
      description: t('settings.navBarDesc'),
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'install',
      group: 'app',
      label: t('settings.installApp'),
      description: t('settings.installAppDesc'),
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: 'general',
      group: 'household',
      label: L('Ogólne', 'General'),
      description: t('settings.householdSectionDesc'),
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'members',
      group: 'household',
      label: isAdmin
        ? `${t('settings.manageMembersTitle')} (${members.length})`
        : `${t('settings.membersTitleCount')} (${members.length})`,
      description: isAdmin ? t('settings.manageMembersDesc') : '',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'categories',
      group: 'household',
      label: t('settings.categoriesTitle'),
      description: L(
        'Kategorie używane do porządkowania produktów w spiżarni.',
        'Categories used to organize products in the pantry.'
      ),
      icon: <Tag className="w-4 h-4" />,
    },
    ...(isAdmin
      ? [
          {
            id: 'sources' as SectionId,
            group: 'household' as SectionGroup,
            label: t('settings.barcodeSourcesTitle'),
            description: t('settings.barcodeSourcesDesc'),
            icon: <Database className="w-4 h-4" />,
          },
          {
            id: 'backup' as SectionId,
            group: 'household' as SectionGroup,
            label: L('Kopia zapasowa', 'Backup & restore'),
            description: t('settings.backupDataDesc'),
            icon: <Download className="w-4 h-4" />,
          },
        ]
      : []),
    ...(user?.isSystemAdmin
      ? [
          {
            id: 'sysHouseholds' as SectionId,
            group: 'system' as SectionGroup,
            label: `${t('settings.systemHouseholdsTitle')} (${systemHouseholds.length})`,
            description: t('settings.systemHouseholdsDesc'),
            icon: <Building2 className="w-4 h-4" />,
          },
          {
            id: 'sysUsers' as SectionId,
            group: 'system' as SectionGroup,
            label: `${t('settings.allUsersTitle')} (${systemUsers.length})`,
            description: t('settings.allUsersDesc'),
            icon: <UserCog className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  const groupLabels: Record<SectionGroup, string> = {
    app: L('Aplikacja', 'App'),
    household: t('settings.householdSection'),
    system: t('settings.adminSystemSection'),
  };

  const visibleGroups = (['app', 'household', 'system'] as SectionGroup[]).filter(
    (group) => sections.some((section) => section.group === group)
  );

  const requestedSection =
    activeSection && sections.some((s) => s.id === activeSection)
      ? activeSection
      : null;

  // Na desktopie zawsze pokazujemy jakąś sekcję; na telefonie najpierw listę.
  const currentSectionId: SectionId | null =
    requestedSection ?? (isDesktop ? sections[0]?.id ?? null : null);

  const currentSection = sections.find((s) => s.id === currentSectionId) || null;

  /* -------------------------------------------------------------------------- */
  /*  Renderery sekcji                                                          */
  /* -------------------------------------------------------------------------- */

  const inputClass =
    'px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500';

  const primaryButtonClass =
    'px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors';

  const secondaryButtonClass =
    'px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40';

  const sortedNavItems = [...navConfig].sort((a, b) => a.order - b.order);

  const renderAppearance = () => (
    <div className="space-y-5">
      {/* Język */}
      <SettingsCard>
        <SettingsBlock>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Languages className="w-4 h-4 text-emerald-400" />
              {t('settings.languageTitle')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{t('settings.languageDesc')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                code: 'en' as const,
                flag: '🇬🇧',
                title: t('settings.langEnglish'),
                sub: t('settings.langEnglishSub'),
                toast: t('settings.langSetEnToast'),
              },
              {
                code: 'pl' as const,
                flag: '🇵🇱',
                title: t('settings.langPolish'),
                sub: t('settings.langPolishSub'),
                toast: t('settings.langSetPlToast'),
              },
            ].map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setLanguage(option.code);
                  showToast(option.toast, 'success');
                }}
                className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all ${
                  language === option.code
                    ? 'bg-slate-800 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center text-xl shrink-0">
                  {option.flag}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">{option.title}</div>
                  <div className="text-xs text-slate-400">{option.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </SettingsBlock>
      </SettingsCard>

      {/* Kolor akcentu */}
      <SettingsCard>
        <SettingsBlock>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                {t('settings.accentColorTitle')}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {t('settings.accentColorDesc')}
              </p>
            </div>

            {accentTheme !== 'emerald' && (
              <button
                type="button"
                onClick={resetAccentTheme}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('settings.defaultThemeBtn')}</span>
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
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                    selected
                      ? 'bg-slate-800 border-white/30'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl shrink-0 transition-transform ${
                      selected ? 'scale-110' : ''
                    }`}
                    style={{
                      backgroundColor: theme.color,
                      boxShadow: selected ? `0 0 18px ${theme.color}55` : 'none',
                    }}
                  />

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      {theme.label[language] || theme.label.pl}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {theme.description[language] || theme.description.pl}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SettingsBlock>
      </SettingsCard>

      <p className="text-[11px] text-slate-500 px-1">
        {L(
          'Język i kolor są zapamiętywane tylko na tym urządzeniu.',
          'Language and color are stored on this device only.'
        )}
      </p>
    </div>
  );

  const renderNavigation = () => (
    <div className="space-y-3">
      <SettingsCard>
        <SettingsRow
          title={t('settings.navBarTitle')}
          description={L(
            'Pokaż, ukryj i zmień kolejność pozycji. Zapisane tylko na tym urządzeniu.',
            'Show, hide, and reorder items. Stored on this device only.'
          )}
        >
          <button
            onClick={resetNavConfig}
            className={secondaryButtonClass}
            title={t('settings.navBarResetTooltip')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('settings.navBarResetBtn')}</span>
          </button>
        </SettingsRow>

        {sortedNavItems.map((item, index) => {
          if (item.id === 'audit' && !isAdmin) return null;
          const localizedLabel = (t as any)(`nav.${item.id}`) || item.label;

          return (
            <div
              key={item.id}
              className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleNavVisibility(item.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    item.visible
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-slate-500 bg-slate-900'
                  }`}
                  title={
                    item.visible
                      ? t('settings.navHideItem')
                      : t('settings.navShowItem')
                  }
                >
                  {item.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>

                <span
                  className={`text-sm font-semibold truncate ${
                    item.visible ? 'text-white' : 'text-slate-500 line-through'
                  }`}
                >
                  {localizedLabel}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
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
      </SettingsCard>
    </div>
  );

  const renderInstall = () => (
    <SettingsCard>
      <SettingsRow
        icon={
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-950/60">
            <Smartphone className="w-5 h-5" />
          </div>
        }
        title={t('settings.installApp')}
        description={t('settings.installAppDesc')}
      >
        <button
          onClick={() => setIsInstallModalOpen(true)}
          className={primaryButtonClass}
        >
          {t('settings.installGuideBtn')}
        </button>
      </SettingsRow>
    </SettingsCard>
  );

  const renderGeneral = () => (
    <div className="space-y-5">
      <SettingsCard>
        {/* Nazwa gospodarstwa */}
        {isAdmin ? (
          <form onSubmit={handleSaveHouseholdName}>
            <SettingsRow
              icon={<PencilLine className="w-4 h-4 text-emerald-400" />}
              title={t('settings.householdName')}
              description={`${t('settings.householdNameNotice')} · ${
                householdNameInput.length
              }/60 ${t('settings.charCount')}`}
            >
              <input
                type="text"
                value={householdNameInput}
                onChange={(e) => setHouseholdNameInput(e.target.value)}
                minLength={2}
                maxLength={60}
                placeholder={t('settings.householdNamePlaceholder')}
                className={`${inputClass} w-full sm:w-52`}
              />

              <button
                type="submit"
                disabled={
                  householdNameSaving ||
                  !householdNameInput.trim() ||
                  householdNameInput.trim() === user?.household?.name
                }
                className={primaryButtonClass}
              >
                <Save className="w-3.5 h-3.5" />
                {householdNameSaving
                  ? t('settings.savingBtn')
                  : t('settings.changeNameBtn')}
              </button>
            </SettingsRow>
          </form>
        ) : (
          <SettingsRow
            icon={<Home className="w-4 h-4 text-emerald-400" />}
            title={t('settings.householdName')}
          >
            <span className="text-sm font-semibold text-slate-200">
              {user?.household?.name}
            </span>
          </SettingsRow>
        )}

        {/* Kod zaproszenia */}
        {isAdmin && (
          <SettingsRow
            icon={<KeyRound className="w-4 h-4 text-emerald-400" />}
            title={t('settings.inviteCode')}
            description={t('settings.inviteCodeNotice')}
          >
            {inviteTimeLeft > 0 && user?.household?.inviteCode ? (
              <>
                <div className="flex items-center gap-3 bg-slate-950 pl-3 pr-1.5 py-1.5 rounded-2xl border border-emerald-500/40">
                  <div>
                    <div className="font-mono text-lg font-extrabold text-emerald-400 tracking-widest leading-tight">
                      {user.household.inviteCode}
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      {t('settings.expiresNotice')}
                      <span
                        className={`font-mono font-bold ${
                          inviteTimeLeft <= 60 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {String(Math.floor(inviteTimeLeft / 60)).padStart(2, '0')}:
                        {String(inviteTimeLeft % 60).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.household!.inviteCode);
                      showToast(
                        `${t('settings.inviteCodeCopySuccess')} ${user.household!.inviteCode}`,
                        'success'
                      );
                    }}
                    className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition-all active:scale-95"
                    title={t('settings.copyInviteTooltip')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateInviteCode}
                  className={secondaryButtonClass}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('settings.newCodeBtn')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGenerateInviteCode}
                className={primaryButtonClass}
              >
                <KeyRound className="w-4 h-4" />
                {t('settings.generateCodeBtn')}
              </button>
            )}
          </SettingsRow>
        )}

        {/* Termin ważności */}
        <SettingsRow
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          title={t('settings.expiryWarningDaysTitle')}
          description={t('settings.expiryWarningDaysDesc')}
        >
          <input
            type="number"
            min={1}
            max={90}
            value={warningDaysInput}
            onChange={(e) => setWarningDaysInput(e.target.value)}
            aria-label={t('settings.warningDaysInputLabel')}
            className={`${inputClass} w-20`}
          />

          <button
            type="button"
            onClick={handleSaveExpiryWarningDays}
            disabled={warningDaysSaving}
            className={primaryButtonClass}
          >
            <Save className="w-3.5 h-3.5" />
            {warningDaysSaving
              ? t('settings.savingBtn')
              : t('settings.saveWarningDays')}
          </button>
        </SettingsRow>
      </SettingsCard>

      {/* Zmiana gospodarstwa (tylko zwykli użytkownicy) */}
      {!isAdmin && (
        <SettingsCard>
          <form onSubmit={handleJoinOtherHousehold}>
            <SettingsRow
              icon={<KeyRound className="w-4 h-4 text-amber-400" />}
              title={t('settings.changeHouseholdTitle')}
              description={t('settings.changeHouseholdDesc')}
            >
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder={t('settings.inviteCodePlaceholder')}
                className={`${inputClass} w-full sm:w-40 font-mono tracking-wider`}
              />

              <button
                type="submit"
                disabled={!inviteCodeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors disabled:opacity-40"
              >
                {t('settings.joinWithCodeBtn')}
              </button>
            </SettingsRow>
          </form>
        </SettingsCard>
      )}
    </div>
  );

  const renderMembers = () => (
    <SettingsCard>
      {members.map((member) => {
        const isMe = member.id === user?.id;

        return (
          <div
            key={member.id}
            className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-sm text-slate-200 shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="truncate">{member.name}</span>

                  {isMe && (
                    <span className="text-[10px] text-slate-400 font-normal shrink-0">
                      {t('settings.youBadge')}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 truncate">{member.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && !isMe ? (
                <select
                  value={member.role}
                  onChange={(e) =>
                    handleUpdateRole(member.id, e.target.value as UserRole)
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              ) : (
                <RoleBadge role={member.role} />
              )}

              {isAdmin && !isMe && (
                <button
                  onClick={() => handleRemoveMember(member.id, member.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                  title={t('settings.kickMember')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </SettingsCard>
  );

  const renderCategories = () => (
    <SettingsCard>
      <SettingsBlock>
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={t('settings.categoryNamePlaceholder')}
            className={`${inputClass} flex-1`}
          />

          <button
            type="submit"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
          >
            {t('settings.addCategory')}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
            >
              <span>{tCategory(cat.name)}</span>

              {categories.length > 1 && (
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="text-slate-500 hover:text-rose-400 ml-1"
                  aria-label={t('settings.deleteCategoryConfirm').replace(
                    '{name}',
                    tCategory(cat.name)
                  )}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </SettingsBlock>
    </SettingsCard>
  );

  const renderSources = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={resetBarcodeSources}
          disabled={barcodeSourcesSaving}
          className={secondaryButtonClass}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('settings.defaultSourcesBtn')}
        </button>

        <button
          onClick={saveBarcodeSources}
          disabled={barcodeSourcesSaving || barcodeSourcesLoading}
          className={primaryButtonClass}
        >
          <Save className="w-3.5 h-3.5" />
          {barcodeSourcesSaving
            ? t('settings.savingSources')
            : t('settings.saveSources')}
        </button>
      </div>

      {barcodeSourcesLoading ? (
        <div className="text-xs text-slate-400 py-3">
          {t('settings.loadingSources')}
        </div>
      ) : (
        <div className="space-y-2">
          {barcodeSources.map((source, index) => {
            const providerMeta = BARCODE_PROVIDER_OPTIONS.find(
              (option) => option.provider === source.provider
            );

            return (
              <div
                key={`${source.provider}-${source.countryCode}-${index}`}
                className={`p-3 rounded-2xl border transition-colors ${
                  source.enabled
                    ? 'bg-slate-900/80 border-slate-700'
                    : 'bg-slate-950/60 border-slate-800 opacity-65'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-2 self-start lg:self-auto">
                    <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 flex items-center justify-center">
                      {index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleBarcodeSource(index)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border ${
                        source.enabled
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                    >
                      {source.enabled
                        ? t('settings.sourceEnabled')
                        : t('settings.sourceDisabled')}
                    </button>
                  </div>

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
                        {BARCODE_PROVIDER_OPTIONS.map((option) => (
                          <option key={option.provider} value={option.provider}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      {providerMeta?.supportsCountry ? (
                        <select
                          value={source.countryCode}
                          onChange={(e) =>
                            updateBarcodeSourceCountry(index, e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                        >
                          {COUNTRY_OPTIONS.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.label[language] || country.label.pl}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                          <Globe2 className="w-3.5 h-3.5" />
                          {t('settings.globalDatabase')}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {providerMeta?.description[language] ||
                        providerMeta?.description.pl}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 self-end lg:self-auto">
                    <button
                      onClick={() => moveBarcodeSource(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => moveBarcodeSource(index, 'down')}
                      disabled={index === barcodeSources.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => removeBarcodeSource(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {barcodeSources.length === 0 && (
            <div className="p-4 rounded-2xl border border-dashed border-slate-700 text-center text-xs text-slate-500">
              {t('settings.noSourcesFound')}
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
          {t('settings.addSourceBtn')}
        </button>
      )}

      <p className="text-[11px] text-slate-500 px-1">
        {L(
          'Źródła są przeszukiwane od góry. Pamiętaj, aby zapisać zmiany.',
          'Sources are searched from the top. Remember to save your changes.'
        )}
      </p>
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-5">
      <SettingsCard>
        <SettingsRow
          icon={<Download className="w-4 h-4 text-emerald-400" />}
          title={t('settings.backupDataTitle')}
          description={t('settings.backupDataDesc')}
        >
          <button onClick={handleDownloadBackup} className={primaryButtonClass}>
            <Download className="w-3.5 h-3.5" />
            {t('settings.exportBackup')}
          </button>
        </SettingsRow>
      </SettingsCard>

      <div className="rounded-3xl bg-slate-900/80 border border-amber-500/30 divide-y divide-amber-500/10">
        <SettingsRow
          icon={<Upload className="w-4 h-4 text-amber-400" />}
          title={t('settings.restoreBackupTitle')}
          description={t('settings.restoreBackupDesc')}
        >
          <label
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              backupRestoring
                ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 cursor-pointer'
            }`}
          >
            <Upload className="w-4 h-4" />
            {backupRestoring
              ? t('settings.restoringBackup')
              : t('settings.chooseFileAndRestore')}
            <input
              type="file"
              accept="application/json,.json"
              disabled={backupRestoring}
              className="hidden"
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (file) void handleRestoreBackup(file);
                input.value = '';
              }}
            />
          </label>
        </SettingsRow>

        <div className="p-4 sm:px-5 text-[11px] text-amber-200 bg-amber-500/5 rounded-b-3xl">
          {t('settings.restoreWarning')}
        </div>
      </div>
    </div>
  );

  const renderSystemHouseholds = () => (
    <div className="space-y-4">
      <SettingsCard>
        <SettingsBlock>
          <form
            onSubmit={handleCreateSystemHousehold}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={newSystemHouseholdName}
              onChange={(e) => setNewSystemHouseholdName(e.target.value)}
              minLength={2}
              maxLength={60}
              placeholder={t('settings.newHouseholdPlaceholder')}
              className={`${inputClass} flex-1`}
            />
            <button
              type="submit"
              disabled={!newSystemHouseholdName.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              {t('settings.createHouseholdBtn')}
            </button>
          </form>
        </SettingsBlock>
      </SettingsCard>

      <SettingsCard>
        {systemHouseholds.map((household) => {
          const expiresAt = household.inviteCodeExpiresAt
            ? new Date(household.inviteCodeExpiresAt).getTime()
            : 0;
          const codeActive = expiresAt > Date.now();

          return (
            <div
              key={household.id}
              className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-bold text-sm text-white">{household.name}</div>
                <div className="text-[11px] text-slate-400">
                  {household.memberCount}{' '}
                  {household.memberCount === 1
                    ? t('settings.usersCountSingular')
                    : t('settings.usersCountPlural')}
                </div>
                {codeActive && (
                  <div className="text-[10px] text-emerald-400 font-mono mt-1">
                    {t('settings.codeLabel')} {household.inviteCode}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleGenerateSystemInvite(household)}
                className={`${secondaryButtonClass} shrink-0`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                {codeActive ? t('settings.newCodeBtn') : t('settings.generateCodeBtn')}
              </button>
            </div>
          );
        })}

        {!systemLoading && systemHouseholds.length === 0 && (
          <div className="p-5 text-center text-xs text-slate-500">
            {t('settings.noHouseholds')}
          </div>
        )}
      </SettingsCard>
    </div>
  );

  const renderSystemUsers = () => (
    <>
      {systemLoading ? (
        <div className="text-xs text-slate-400 py-3">{t('settings.loadingUsers')}</div>
      ) : (
        <SettingsCard>
          {systemUsers.map((systemUser) => {
            const isMe = systemUser.id === user?.id;

            return (
              <div key={systemUser.id} className="p-4 sm:px-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {systemUser.name}
                      </span>

                      {isMe && (
                        <span className="text-[10px] text-slate-400">
                          {t('settings.youBadge')}
                        </span>
                      )}

                      {systemUser.isPrimaryAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-extrabold">
                          <Crown className="w-3 h-3" />
                          {t('settings.primaryAccountBadge')}
                        </span>
                      )}

                      {systemUser.isSystemAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-extrabold">
                          <Crown className="w-3 h-3" />
                          {t('settings.systemAdminBadge')}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 truncate">
                      {systemUser.email}
                    </div>
                  </div>

                  {!isMe && !systemUser.isPrimaryAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSystemUser(systemUser)}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('settings.deleteAccountBtn')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t('settings.householdLabel')}
                    </label>
                    <select
                      value={systemUser.householdId || ''}
                      onChange={(e) =>
                        handleSystemUserHouseholdChange(systemUser, e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">{t('settings.noHouseholdOption')}</option>
                      {systemHouseholds.map((household) => (
                        <option key={household.id} value={household.id}>
                          {household.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t('settings.householdRoleLabel')}
                    </label>
                    <select
                      value={systemUser.role}
                      onChange={(e) =>
                        handleSystemUserRoleChange(
                          systemUser,
                          e.target.value as UserRole
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t('settings.systemPermissionsLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSystemAdminToggle(systemUser)}
                      disabled={
                        (isMe && systemUser.isSystemAdmin) ||
                        (systemUser.isPrimaryAdmin && systemUser.isSystemAdmin)
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        systemUser.isSystemAdmin
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {systemUser.isSystemAdmin
                        ? t('settings.systemAdminRoleBtn')
                        : t('settings.grantSystemAdminBtn')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </SettingsCard>
      )}
    </>
  );

  const renderSectionContent = () => {
    switch (currentSectionId) {
      case 'appearance':
        return renderAppearance();
      case 'navigation':
        return renderNavigation();
      case 'install':
        return renderInstall();
      case 'general':
        return renderGeneral();
      case 'members':
        return renderMembers();
      case 'categories':
        return renderCategories();
      case 'sources':
        return renderSources();
      case 'backup':
        return renderBackup();
      case 'sysHouseholds':
        return renderSystemHouseholds();
      case 'sysUsers':
        return renderSystemUsers();
      default:
        return null;
    }
  };

  /* -------------------------------------------------------------------------- */
  /*  Render                                                                    */
  /* -------------------------------------------------------------------------- */

  const showMenu = isDesktop || currentSectionId === null;
  const showContent = isDesktop || currentSectionId !== null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Nagłówek */}
      {showMenu && (
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-400" />
            {t('settings.title')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t('settings.subtitle')}</p>
        </div>
      )}

      <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] md:gap-8 md:items-start">
        {/* Menu sekcji */}
        {showMenu && (
          <nav
            aria-label={t('settings.title')}
            className="space-y-5 md:sticky md:top-4"
          >
            {visibleGroups.map((group) => (
              <div key={group}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pb-1.5 flex items-center gap-1.5">
                  {group === 'system' && <Crown className="w-3 h-3 text-amber-400" />}
                  {groupLabels[group]}
                </div>

                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 md:bg-transparent md:border-transparent md:rounded-none divide-y divide-slate-800 md:divide-y-0 md:space-y-0.5">
                  {sections
                    .filter((section) => section.group === group)
                    .map((section) => {
                      const selected = currentSectionId === section.id;

                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setActiveSection(section.id)}
                          aria-current={selected ? 'page' : undefined}
                          className={`w-full flex items-center gap-3 px-3 py-3 md:py-2 md:rounded-xl text-left text-sm transition-colors ${
                            selected
                              ? 'md:bg-emerald-500/10 md:text-emerald-300 font-bold text-emerald-300'
                              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                          }`}
                        >
                          <span
                            className={
                              selected ? 'text-emerald-400' : 'text-slate-500'
                            }
                          >
                            {section.icon}
                          </span>
                          <span className="flex-1 truncate font-semibold">
                            {section.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-600 md:hidden" />
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>
        )}

        {/* Zawartość sekcji */}
        {showContent && currentSection && (
          <div className="min-w-0 space-y-5">
            <div>
              {!isDesktop && (
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className="mb-3 -ml-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('settings.title')}
                </button>
              )}

              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span className="text-emerald-400">{currentSection.icon}</span>
                {currentSection.label}
              </h3>

              {currentSection.description && (
                <p className="text-xs text-slate-400 mt-1">
                  {currentSection.description}
                </p>
              )}
            </div>

            {renderSectionContent()}
          </div>
        )}
      </div>

      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};