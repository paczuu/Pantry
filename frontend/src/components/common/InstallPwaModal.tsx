import React from 'react';
import { Modal } from './Modal';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useLanguage } from '../../language/LanguageContext';
import { Smartphone, Download, Share, CheckCircle, Monitor } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, installPwa } = usePwaInstall();
  const { t, language } = useLanguage();

  const handleInstallClick = async () => {
    const success = await installPwa();
    if (success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('pwa.modalTitle')} maxWidth="md">
      <div className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-7rem)] overflow-y-auto overscroll-contain pr-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-4 text-slate-200 text-xs sm:text-sm leading-relaxed">

        {/* Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-950/50">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">
              {language === 'en' ? 'Install as a native app' : 'Zainstaluj jako aplikację natywną'}
            </h4>
            <p className="text-xs text-slate-300">
              {language === 'en'
                ? 'Quick access from home screen, no browser address bars, and instant performance.'
                : 'Szybki dostęp z ekranu telefonu, brak pasków przeglądarki i błyskawiczne działanie.'}
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 font-semibold text-xs">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            {language === 'en' ? 'The application is already installed on your device!' : 'Aplikacja jest już zainstalowana na Twoim urządzeniu!'}
          </div>
        ) : isInstallable ? (
          <div className="space-y-3">
            <p className="text-slate-300 text-xs">
              {language === 'en'
                ? 'Your browser supports direct 1-click app installation:'
                : 'Twoja przeglądarka obsługuje bezpośrednią 1-kliknięciową instalację aplikacji:'}
            </p>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Download className="w-4 h-4" />
              {t('pwa.installNativeBtn')}
            </button>
          </div>
        ) : isIOS ? (
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
              <Share className="w-4 h-4 text-cyan-400" />
              {t('pwa.iosTitle')}
            </h5>

            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              <li>{language === 'en' ? <>Open this page in <strong>Safari</strong> browser.</> : <>Otwórz tę stronę w przeglądarce <strong>Safari</strong>.</>}</li>
              <li>{t('pwa.iosStep1')}</li>
              <li>{t('pwa.iosStep2')}</li>
              <li>{language === 'en' ? <>Click <strong className="text-white">„Add”</strong> in top right corner.</> : <>Kliknij <strong className="text-white">„Dodaj”</strong> w prawym górnym rogu.</>}</li>
            </ol>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs text-slate-300">
            <h5 className="font-bold text-white flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-emerald-400" />
              {language === 'en' ? 'Manual installation:' : 'Instalacja ręczna:'}
            </h5>

            <p>
              {language === 'en'
                ? 'From browser menu, select Install App or Add to Home Screen.'
                : 'W menu przeglądarki wybierz opcję instalacji aplikacji lub dodania jej do ekranu głównego.'}
            </p>

            <div className="font-semibold text-emerald-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
              {language === 'en' ? '„Install Pantry App” or „Add to Home Screen”' : '„Zainstaluj aplikację Pantry” lub „Dodaj do ekranu głównego”'}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};