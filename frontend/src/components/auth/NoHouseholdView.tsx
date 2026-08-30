import React, { useState } from 'react';
import { Home, KeyRound, LogOut, Trash2, UserRoundX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';

export const NoHouseholdView: React.FC = () => {
  const { user, joinHousehold, logout } = useAuth();
  const { showToast } = useToast();
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = inviteCode.trim().toUpperCase();

    if (code.length !== 6) {
      showToast('Kod zaproszenia musi mieć 6 znaków.', 'error');
      return;
    }

    try {
      setJoining(true);
      await joinHousehold(code);
      setInviteCode('');
    } catch (e) {
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Czy na pewno chcesz trwale usunąć swoje konto? Tej operacji nie można cofnąć.'
    );

    if (!confirmed) return;

    const confirmedAgain = window.confirm(
      `Konto ${user?.email || ''} zostanie całkowicie usunięte z bazy danych. Kontynuować?`
    );

    if (!confirmedAgain) return;

    try {
      setDeleting(true);
      const res = await api.deleteOwnAccount();
      logout();
      showToast(res.message || 'Konto zostało usunięte.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Nie udało się usunąć konta.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-lg space-y-4">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
              <UserRoundX className="w-7 h-7 text-amber-400" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Nie należysz do żadnego gospodarstwa
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Aby korzystać ze spiżarni, list zakupów i pozostałych funkcji aplikacji, dołącz do gospodarstwa za pomocą aktywnego kodu zaproszenia.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Dołącz do gospodarstwa</h2>
            </div>

            <form onSubmit={handleJoinHousehold} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kod zaproszenia
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    minLength={6}
                    maxLength={6}
                    placeholder="AB12CD"
                    disabled={joining || deleting}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tracking-[0.2em] text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={joining || deleting || inviteCode.length !== 6}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {joining ? 'Dołączanie...' : 'Dołącz do gospodarstwa'}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-white">Twoje konto</h2>
              <p className="text-[11px] text-slate-500 mt-1">
                Zalogowano jako {user?.email}. Jeśli nie chcesz korzystać z tego konta, możesz je trwale usunąć.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={logout}
                disabled={joining || deleting}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <LogOut className="w-4 h-4" />
                Wyloguj się
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={joining || deleting}
                className="py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Usuwanie...' : 'Usuń moje konto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
