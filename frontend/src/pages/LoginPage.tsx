import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { FieldLabel, Input } from '../components/ui/FormControls';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../language/LanguageContext';
import { UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { t, language } = useLanguage();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      // The error is shown by the toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-950 flex flex-col items-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100">
      {/* The whole page scrolls (e.g. with the keyboard open) instead of trapping the form in a small card */}
      <div className="w-full max-w-md my-auto space-y-4 sm:space-y-6">
        {/* Logo and heading */}
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

        {/* Form card (handles overflow) */}
        <div className="p-5 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
          {/* Tabs: sign in / register */}
          <SegmentedControl
            fill
            value={isRegister ? 'register' : 'login'}
            onChange={(mode) => setIsRegister(mode === 'register')}
            options={[
              { value: 'login', label: language === 'en' ? 'Log in' : 'Logowanie' },
              { value: 'register', label: language === 'en' ? 'Register' : 'Rejestracja' },
            ]}
          />

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div>
                <FieldLabel>{t('auth.nameLabel')} *</FieldLabel>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. John, Alex' : 'np. Anna, Jan'}
                />
              </div>
            )}

            <div>
              <FieldLabel>{t('auth.emailLabel')} *</FieldLabel>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'en' ? 'your@email.com' : 'twoj@email.pl'}
              />
            </div>

            <div>
              <FieldLabel>{t('auth.passwordLabel')} *</FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-3.5 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-2"
                  title={showPassword ? (language === 'en' ? 'Hide password' : 'Ukryj hasło') : (language === 'en' ? 'Show password' : 'Pokaż hasło')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <FieldLabel>
                  {language === 'en' ? 'Household invite code' : 'Kod zaproszenia do gospodarstwa'}
                </FieldLabel>
                <Input
                  type="text"
                  minLength={6}
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={language === 'en' ? 'e.g. AB12CD' : 'np. AB12CD'}
                  className="font-mono tracking-widest"
                />
                <p className="text-[11px] text-slate-500">
                  {language === 'en'
                    ? 'Registration requires providing an active 6-digit household invite code.'
                    : 'Rejestracja wymaga podania aktywnego kodu zaproszenia.'}
                </p>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              type="submit"
              fullWidth
              disabled={isLoading}
              className="mt-1"
              icon={isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            >
              {isLoading
                ? (language === 'en' ? 'Processing...' : 'Przetwarzanie...')
                : isRegister
                ? t('auth.registerBtn')
                : t('auth.loginBtn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};