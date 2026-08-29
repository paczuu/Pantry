import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePantry } from '../../contexts/PantryContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { User, UserRole, NavItemConfig } from '../../types';
import { InstallPwaModal } from '../common/InstallPwaModal';
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
} from 'lucide-react';

const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Pulpit', visible: true, order: 1 },
  { id: 'pantry', label: 'Spiżarnia', visible: true, order: 2 },
  { id: 'scan-action', label: 'Skaner', visible: true, order: 3 },
  { id: 'shopping', label: 'Zakupy', visible: true, order: 4 },
  { id: 'notes', label: 'Notatki', visible: true, order: 5 },
  { id: 'audit', label: 'Audyt', visible: true, order: 6 },
  { id: 'settings', label: 'Opcje', visible: true, order: 7 },
];

export const HouseholdSettingsView: React.FC = () => {
  const { user, isAdmin, refreshUser, joinHousehold } = useAuth();
  const { categories, refreshSettings } = usePantry();
  const { showToast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Nawigacja
  const [navConfig, setNavConfig] = useState<NavItemConfig[]>(() => {
    try {
      const saved = localStorage.getItem('spizarnia_nav_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_NAV_ITEMS;
  });

  const saveNavConfig = (newConfig: NavItemConfig[]) => {
    setNavConfig(newConfig);
    localStorage.setItem('spizarnia_nav_config', JSON.stringify(newConfig));
    window.dispatchEvent(new Event('spizarnia_nav_updated'));
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

    const updated = sorted.map((item, idx) => ({ ...item, order: idx + 1 }));
    saveNavConfig(updated);
  };

  const resetNavConfig = () => {
    saveNavConfig(DEFAULT_NAV_ITEMS);
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
  }, []);

  const handleCopyCode = () => {
    if (user?.household?.inviteCode) {
      navigator.clipboard.writeText(user.household.inviteCode);
      showToast(`Skopiowano kod zaproszenia: ${user.household.inviteCode}`, 'success');
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
    if (window.confirm(`Czy na pewno chcesz usunąć użytkownika "${name}" z gospodarstwa?`)) {
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

    if (window.confirm('Dołączenie do innego gospodarstwa spowoduje opuszczenie obecnego. Kontynuować?')) {
      try {
        await joinHousehold(inviteCodeInput.trim());
        setInviteCodeInput('');
      } catch (e) {}
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/settings/backup', '_blank');
    showToast('Pobieranie kopii zapasowej spiżarni...', 'info');
  };

  const sortedNavItems = [...navConfig].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Nagłówek */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Home className="w-6 h-6 text-emerald-400" />
          Gospodarstwo Domowe i Ustawienia
        </h2>
        <p className="text-xs text-slate-400">
          Zarządzaj domownikami, uprawnieniami, kategoriami i wyglądem paska nawigacji
        </p>
      </div>

      {/* Instalacja Aplikacji PWA Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-emerald-950/40 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-950/60">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Instalacja Aplikacji (PWA)</h3>
            <p className="text-xs text-slate-300">
              Zainstaluj aplikację na telefonie (Android, iOS) lub komputerze, aby mieć do niej błyskawiczny dostęp.
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

      {/* Box Kodu Zaproszenia Domowników */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-emerald-400">Współdzielenie Spiżarni</div>
            <h3 className="text-lg font-extrabold text-white">
              {user?.household?.name || 'Moje Gospodarstwo'}
            </h3>
            <p className="text-xs text-slate-300">
              Podaj ten kod domownikowi podczas rejestracji lub dołączania, aby wspólnie zarządzać produktami.
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
      </div>

      {/* Personalizacja Dolnego Paska Nawigacyjnego */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Personalizacja paska nawigacji
            </h3>
            <p className="text-xs text-slate-400">
              Zmieniaj kolejność przycisków na dolnym pasku oraz ukrywaj te, z których nie korzystasz
            </p>
          </div>
          <button
            onClick={resetNavConfig}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Przywróć domyślny układ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Domyślne</span>
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
                      item.visible ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-900'
                    }`}
                    title={item.visible ? 'Ukryj ten przycisk' : 'Pokaż ten przycisk'}
                  >
                    {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className={`text-sm font-semibold ${item.visible ? 'text-white' : 'text-slate-500 line-through'}`}>
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveNavItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                    title="Przesuń w lewo / w górę"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveNavItem(index, 'down')}
                    disabled={index === sortedNavItems.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                    title="Przesuń w prawo / w dół"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista Członków Gospodarstwa */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Członkowie gospodarstwa ({members.length})
          </h3>
        </div>

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
                      {isMe && <span className="text-[10px] text-slate-400 font-normal">(Ty)</span>}
                    </div>
                    <div className="text-xs text-slate-400">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && !isMe ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="MEMBER">Domownik (MEMBER)</option>
                      <option value="ADMIN">Administrator (ADMIN)</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                        isMemberAdmin
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isMemberAdmin && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                      {member.role}
                    </span>
                  )}

                  {isAdmin && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                      title="Usuń z gospodarstwa"
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

      {/* Konfiguracja Kategorii */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-cyan-400" />
          Kategorie produktów
        </h3>

        <form onSubmit={handleAddCategory} className="flex gap-2">
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
              <span>{cat.name}</span>
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

      {/* Kopia Zapasowa & Dołączanie do innego gospodarstwa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            Zmień gospodarstwo domowe
          </h4>
          <form onSubmit={handleJoinOtherHousehold} className="space-y-2">
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
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
      </div>

      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};
