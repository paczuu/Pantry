import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new Event('pwa-install-state-changed'));
  });
}

export const usePwaInstall = () => {
  const [isInstallable, setIsInstallable] = useState(() => deferredInstallPrompt !== null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const checkInstalledState = useCallback(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(isStandalone);

    if (isStandalone) {
      setIsInstallable(false);
    } else {
      setIsInstallable(deferredInstallPrompt !== null);
    }
  }, []);

  useEffect(() => {
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    setIsIOS(isIOSDevice);
    checkInstalledState();

    const handleInstallAvailable = () => {
      setIsInstallable(deferredInstallPrompt !== null);
    };

    const handleInstallStateChanged = () => {
      checkInstalledState();
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');

    const handleDisplayModeChange = () => {
      checkInstalledState();
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-state-changed', handleInstallStateChanged);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-state-changed', handleInstallStateChanged);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, [checkInstalledState]);

  const installPwa = async () => {
    if (!deferredInstallPrompt) return false;

    try {
      const promptEvent = deferredInstallPrompt;

      await promptEvent.prompt();

      const choiceResult = await promptEvent.userChoice;

      deferredInstallPrompt = null;
      setIsInstallable(false);

      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Błąd instalacji PWA:', error);
      deferredInstallPrompt = null;
      setIsInstallable(false);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    installPwa,
  };
};