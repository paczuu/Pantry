import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { InstallPwaModal } from './InstallPwaModal';
import {
  Sparkles,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Smartphone,
  Settings,
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
  onGoDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onGoDashboard }) => {
  const { user, logout, isAdmin } = useAuth();
  const { isInstalled } = usePwaInstall();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Nazwa Domu */}
          <button
            type="button"
            onClick={onGoDashboard}
            className="flex items-center gap-3 text-left rounded-2xl -ml-1 px-1 py-0.5 hover:bg-slate-900/80 transition-colors"
            title="Przejdź do pulpitu"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-lg shadow-emerald-950/60 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  Spiżarnia
                </h1>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                {user?.household?.name || 'Gospodarstwo domowe'}
              </p>
            </div>
          </button>

          {/* Prawa strona: Przycisk instalacji PWA + Profil */}
          <div className="flex items-center gap-2">
            {!isInstalled && (
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                title="Zainstaluj aplikację na telefonie lub pulpicie"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Zainstaluj
              </button>
            )}

            {/* Menu Użytkownika */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition-colors"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline truncate max-w-[100px]">{user?.name}</span>
              </button>

              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl py-2 z-30 text-xs space-y-1 animate-slide-up">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <div className="font-extrabold text-white text-sm truncate">{user?.name}</div>
                      <div className="text-slate-400 text-[11px] truncate">{user?.email}</div>
                      <div className="text-emerald-400 font-mono text-[10px] mt-1">
                        Kod domu: {user?.household?.inviteCode}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsInstallModalOpen(true);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 font-semibold"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      Instalacja aplikacji (PWA)
                    </button>

                    {onOpenSettings && (
                      <button
                        onClick={() => {
                          onOpenSettings();
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 font-semibold"
                      >
                        <Settings className="w-4 h-4 text-cyan-400" />
                        Ustawienia gospodarstwa
                      </button>
                    )}

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      Wyloguj się
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </>
  );
};
