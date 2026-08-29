import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, UserPlus, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [hasInviteCode, setHasInviteCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(
          email.trim(),
          password,
          name.trim(),
          hasInviteCode ? undefined : householdName.trim() || undefined,
          hasInviteCode ? inviteCode.trim().toUpperCase() : undefined
        );
      } else {
        await login(email.trim(), password);
      }
    } catch (e) {
      // Błąd jest już w Toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Logo i Nagłówek */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-2xl shadow-emerald-950/80 items-center justify-center mb-2">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
            Spiżarnia
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Inteligentne zarządzanie zapasami w kuchni, skaner kodów EAN i wspólne listy zakupów.
          </p>
        </div>

        {/* Karta Formularza */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Zakładki: Logowanie / Rejestracja */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`py-2.5 rounded-lg transition-all ${
                !isRegister ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Logowanie
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`py-2.5 rounded-lg transition-all ${
                isRegister ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rejestracja
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Twoje Imię *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Anna, Jan"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Adres Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hasło *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Opcje Gospodarstwa Domowego przy Rejestracji */}
            {isRegister && (
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span>Gospodarstwo domowe</span>
                  <button
                    type="button"
                    onClick={() => setHasInviteCode(!hasInviteCode)}
                    className="text-emerald-400 hover:underline"
                  >
                    {hasInviteCode ? 'Chcę założyć nowe' : 'Mam kod zaproszenia'}
                  </button>
                </div>

                {hasInviteCode ? (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kod zaproszenia od domownika</label>
                    <input
                      type="text"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="np. AB12CD"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tracking-widest text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nazwa gospodarstwa (opcjonalnie)</label>
                    <input
                      type="text"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      placeholder="np. Domowa Spiżarnia"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {isLoading ? 'Przetwarzanie...' : isRegister ? 'Zarejestruj i załóż spiżarnię' : 'Zaloguj się'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
