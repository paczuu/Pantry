import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../language/LanguageContext';
import { UserPlus, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { t, language } = useLanguage();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
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
          inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined
        );
      } else {
        await login(email.trim(), password);
      }
    } catch (e) {
      // Błąd obsługiwany w Toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh w-full bg-slate-950 flex flex-col justify-center items-center p-4 overflow-hidden text-slate-100">
      <div className="w-full max-w-md my-auto space-y-4 sm:space-y-6">
        {/* Logo i Nagłówek */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="inline-flex w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-2xl shadow-emerald-950/80 items-center justify-center">
            <img
              src="/favicon.png"
              alt="Pantry"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
            Pantry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            {language === 'en'
              ? 'Smart kitchen inventory management, barcode scanner, and shared grocery lists.'
              : 'Inteligentne zarządzanie zapasami w kuchni, skaner kodów EAN i wspólne listy zakupów.'}
          </p>
        </div>

        {/* Karta Formularza z obsługą ewentualnego przepełnienia */}
        <div className="p-5 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4 max-h-[calc(100dvh-12rem)] overflow-y-auto">
          {/* Zakładki: Logowanie / Rejestracja */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`py-2 rounded-lg transition-all ${
                !isRegister ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'en' ? 'Log in' : 'Logowanie'}
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`py-2 rounded-lg transition-all ${
                isRegister ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'en' ? 'Register' : 'Rejestracja'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('auth.nameLabel')} *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. John, Alex' : 'np. Anna, Jan'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('auth.emailLabel')} *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'en' ? 'your@email.com' : 'twoj@email.pl'}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('auth.passwordLabel')} *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {isRegister && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <label className="block text-[11px] text-slate-400">
                  {language === 'en' ? 'Household invite code' : 'Kod zaproszenia do gospodarstwa'}
                </label>
                <input
                  type="text"
                  minLength={6}
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={language === 'en' ? 'e.g. AB12CD' : 'np. AB12CD'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tracking-widest text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500">
                  {language === 'en'
                    ? 'Registration requires providing an active 6-digit household invite code.'
                    : 'Rejestracja wymaga podania aktywnego kodu zaproszenia.'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {isLoading
                ? (language === 'en' ? 'Processing...' : 'Przetwarzanie...')
                : isRegister
                ? t('auth.registerBtn')
                : t('auth.loginBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};