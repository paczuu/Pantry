import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QuickAddModal } from './QuickAddModal';
import { QuickRemoveModal } from './QuickRemoveModal';
import { ProductCatalogItem, PantryItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { usePantry } from '../../contexts/PantryContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { X, Flashlight, Keyboard, PlusCircle, MinusCircle, Search, Loader2, Camera, ShieldAlert, Sparkles, SwitchCamera, ScanBarcode } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'ADD' | 'REMOVE' | 'SEARCH';
  onScanSearch?: (barcode: string) => void;
  allowSearch?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'ADD',
  onScanSearch,
  allowSearch = false,
}) => {
  const { showToast, playBeep, vibrate } = useToast();
  const { setFilter } = usePantry();
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<'ADD' | 'REMOVE' | 'SEARCH'>(defaultMode);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('prompt');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Submodals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isQuickRemoveOpen, setIsQuickRemoveOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<ProductCatalogItem | null>(null);
  const [inPantryItems, setInPantryItems] = useState<PantryItem[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'spizarnia-fullscreen-barcode-reader';
  const lastScannedTimeRef = useRef<number>(0);
  const scannerStartingRef = useRef(false);
  const historyPushedRef = useRef(false);

  useEffect(() => {
    setMode(defaultMode === 'SEARCH' && !allowSearch ? 'ADD' : defaultMode);
  }, [defaultMode, allowSearch, isOpen]);

  const stopScanner = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    setIsScanning(false);
    setIsTorchOn(false);
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        try { await (scanner as any).applyVideoConstraints({ advanced: [{ torch: false } as any] }); } catch (e) {}
        await scanner.stop();
      }
    } catch (e) { console.warn('Błąd zatrzymywania skanera:', e); }
    try { scanner.clear(); } catch (e) {}
  }, []);

  const loadCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        
        // Szukaj kamery tylnej po etykiecie
        const backCamIdx = devices.findIndex((d) => {
          const lbl = d.label.toLowerCase();
          return lbl.includes('back') || lbl.includes('tył') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('0, facing back');
        });

        if (backCamIdx !== -1) {
          setSelectedCameraIndex(backCamIdx);
        } else {
          // Jeśli na iOS etykiety są puste, ustawiamy null, by użyć constraints z facingMode: 'environment'
          setSelectedCameraIndex(null);
        }
      } else {
        setCameras([]);
        setSelectedCameraIndex(null);
      }
      return devices || [];
    } catch (e) {
      console.warn('Nie udało się pobrać listy kamer:', e);
      setCameras([]);
      setSelectedCameraIndex(null);
      return [];
    }
  }, []);

  // Sprawdź status uprawnień przy otwarciu
  const checkInitialPermission = useCallback(async () => {
    if (!isOpen) return;
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setCameraError(
        language === 'en'
          ? 'Your browser does not support camera access.'
          : 'Twoja przeglądarka nie obsługuje dostępu do aparatu.'
      );
      return;
    }

    setPermissionState('checking');

    try {
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (status.state === 'granted') {
            await loadCameras();
            setPermissionState('granted');
            return;
          }
          if (status.state === 'denied') {
            setPermissionState('denied');
            setCameraError(
              language === 'en'
                ? 'Camera access is blocked in browser settings.'
                : 'Dostęp do aparatu jest zablokowany w ustawieniach przeglądarki.'
            );
            return;
          }
        } catch (e) {
          // Safari/iOS nie obsługuje nazwy 'camera' w permissions.query
        }
      }
      setPermissionState('prompt');
    } catch (e) {
      setPermissionState('prompt');
    }
  }, [isOpen, loadCameras, language]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('camera');
      setCameraError(null);
      setIsScanning(false);
      setIsTorchOn(false);
      checkInitialPermission();
    } else {
      stopScanner();
      setPermissionState('prompt');
      setCameraError(null);
    }
  }, [isOpen, checkInitialPermission, stopScanner]);

  // Bezpośrednie getUserMedia po kliknięciu użytkownika (iOS User Gesture)
  const handleRequestPermissionClick = async () => {
    try {
      setCameraError(null);
      setPermissionState('checking');

      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState('denied');
        setCameraError(
          language === 'en'
            ? 'Your browser does not support camera access.'
            : 'Twoja przeglądarka nie obsługuje dostępu do aparatu.'
        );
        return;
      }

      // Wymuszamy kamerę tylną przy pierwszym wywołaniu strumienia
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      await loadCameras();
      setPermissionState('granted');
    } catch (err: any) {
      console.warn('Odrzucono dostęp do kamery:', err);
      setIsScanning(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setCameraError(
          language === 'en'
            ? 'Camera access was denied. Allow camera in browser settings or enter barcode manually.'
            : 'Dostęp do aparatu został odrzucony. Zezwól na aparat w ustawieniach przeglądarki lub wpisz kod ręcznie.'
        );
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setPermissionState('denied');
        setCameraError(
          language === 'en'
            ? 'No camera found on this device.'
            : 'Nie znaleziono aparatu na tym urządzeniu.'
        );
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setPermissionState('denied');
        setCameraError(
          language === 'en'
            ? 'Camera is in use by another app or could not start.'
            : 'Aparat jest zajęty przez inną aplikację lub nie może zostać uruchomiony.'
        );
      } else {
        setPermissionState('prompt');
        setCameraError(
          language === 'en'
            ? 'Failed to obtain camera stream.'
            : 'Nie udało się uzyskać obrazu z aparatu.'
        );
      }
    }
  };

  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Obsługa cofania (przycisk Wstecz przeglądarki / gest na telefonie)
  useEffect(() => {
    if (isOpen && !isOpenRef.current) {
      isOpenRef.current = true;
      const scannerId = 'scanner_' + Date.now();
      window.history.pushState({ scannerId }, '');
      historyPushedRef.current = true;

      const handlePopState = () => {
        if (!historyPushedRef.current) return;
        historyPushedRef.current = false;
        isOpenRef.current = false;
        stopScanner();
        onCloseRef.current();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (historyPushedRef.current) {
          historyPushedRef.current = false;
          isOpenRef.current = false;
          if (window.history.state?.scannerId === scannerId) {
            window.history.back();
          }
        }
      };
    } else if (!isOpen && isOpenRef.current) {
      isOpenRef.current = false;
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        window.history.back();
      }
    }
  }, [isOpen, stopScanner]);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    const now = Date.now();
    if (now - lastScannedTimeRef.current < 2000 || isProcessing) return;
    lastScannedTimeRef.current = now;
    if (soundEnabled) playBeep(950, 'sine', 0.15);
    vibrate([60, 40, 60]);

    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;
    setIsProcessing(true);

    await stopScanner();

    if (mode === 'SEARCH') {
      setIsProcessing(false);
      if (onScanSearch) {
        onScanSearch(cleanBarcode);
      } else {
        setFilter('search', cleanBarcode);
      }
      onCloseRef.current();
      return;
    }

    try {
      const res = await api.lookupBarcode(cleanBarcode);
      setScannedBarcode(cleanBarcode);
      setScannedProduct(res.product || null);
      setInPantryItems(res.inPantryItems || []);
      if (mode === 'REMOVE') {
        if (!res.inPantryItems || res.inPantryItems.length === 0) {
          showToast(
            language === 'en'
              ? `No product with barcode ${cleanBarcode} found in pantry.`
              : `Nie znaleziono w spiżarni produktu o kodzie ${cleanBarcode}.`,
            'warning',
            language === 'en' ? 'Not in pantry' : 'Brak w spiżarni'
          );
        } else {
          setIsQuickRemoveOpen(true);
        }
      } else {
        setIsQuickAddOpen(true);
      }
    } catch (error: any) {
      showToast(
        error.message ||
          (language === 'en'
            ? 'Error checking barcode.'
            : 'Błąd podczas sprawdzania kodu EAN.'),
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, mode, onScanSearch, setFilter, onClose, playBeep, showToast, soundEnabled, vibrate, stopScanner, language]);

  // Uruchom skaner
  useEffect(() => {
    let cancelled = false;

    const startScanner = async () => {
      if (!isOpen || activeTab !== 'camera' || isQuickAddOpen || isQuickRemoveOpen || permissionState !== 'granted' || scannerStartingRef.current) return;
      const containerElem = document.getElementById(scannerContainerId);
      if (!containerElem) return;

      scannerStartingRef.current = true;
      setCameraError(null);

      try {
        await stopScanner();
        if (cancelled) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        const qrScanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });

        html5QrCodeRef.current = qrScanner;

        // Jeśli wybrano konkretną kamerę z listy (i wiemy, że to ta właściwa) - używamy deviceId.
        // W przeciwnym wypadku (np. na iOS gdy nazwy były puste) wymuszamy 'environment'.
        const cameraId = selectedCameraIndex !== null && cameras[selectedCameraIndex]?.id ? cameras[selectedCameraIndex].id : null;
        
        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' };

        await qrScanner.start(
          cameraConfig,
          {
            fps: 25,
            qrbox: (viewfinderWidth, viewfinderHeight) => ({
              width: Math.floor(viewfinderWidth * 0.85),
              height: Math.floor(viewfinderHeight * 0.65),
            }),
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!cancelled) handleBarcodeScanned(decodedText);
          },
          () => {}
        );

        if (!cancelled) setIsScanning(true);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Błąd uruchamiania skanera:', err);
          setIsScanning(false);
          if (err?.name === 'NotAllowedError' || String(err).toLowerCase().includes('permission')) {
            setPermissionState('denied');
            setCameraError(
              language === 'en'
                ? 'Camera access denied. Please allow camera in browser settings.'
                : 'Brak dostępu do aparatu. Zezwól na używanie kamery w ustawieniach przeglądarki.'
            );
          } else {
            setCameraError(
              language === 'en'
                ? 'Error starting camera. Ensure no other application is blocking it.'
                : 'Błąd uruchamiania kamery. Upewnij się, że inna aplikacja nie blokuje aparatu.'
            );
          }
        }
      } finally {
        scannerStartingRef.current = false;
      }
    };

    const timer = window.setTimeout(startScanner, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, activeTab, selectedCameraIndex, isQuickAddOpen, isQuickRemoveOpen, cameras, permissionState, handleBarcodeScanned, stopScanner, language]);

  const processBarcode = async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;
    setIsProcessing(true);

    if (mode === 'SEARCH') {
      setIsProcessing(false);
      if (onScanSearch) {
        onScanSearch(cleanBarcode);
      } else {
        setFilter('search', cleanBarcode);
      }
      showToast(
        language === 'en'
          ? `Filtered by barcode: ${cleanBarcode}`
          : `Filtrowanie po kodzie: ${cleanBarcode}`,
        'success'
      );
      handleClose();
      return;
    }

    try {
      const res = await api.lookupBarcode(cleanBarcode);
      setScannedBarcode(cleanBarcode);
      setScannedProduct(res.product || null);
      setInPantryItems(res.inPantryItems || []);
      if (mode === 'REMOVE') {
        if (!res.inPantryItems || res.inPantryItems.length === 0) {
          showToast(
            language === 'en'
              ? `No product with barcode ${cleanBarcode} found in pantry.`
              : `Nie znaleziono w spiżarni produktu o kodzie ${cleanBarcode}.`,
            'warning',
            language === 'en' ? 'Not in pantry' : 'Brak w spiżarni'
          );
        } else {
          setIsQuickRemoveOpen(true);
        }
      } else {
        setIsQuickAddOpen(true);
      }
    } catch (error: any) {
      showToast(
        error.message ||
          (language === 'en'
            ? 'Error checking barcode.'
            : 'Błąd podczas sprawdzania kodu EAN.'),
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processBarcode(manualCode.trim());
  };

  const switchCamera = () => {
    if (cameras.length > 1) {
      setSelectedCameraIndex((prev) => (prev === null ? 0 : (prev + 1) % cameras.length));
    }
  };

  const toggleTorch = async () => {
    try {
      if (html5QrCodeRef.current && isScanning) {
        await (html5QrCodeRef.current as any).applyVideoConstraints({ advanced: [{ torch: !isTorchOn } as any] });
        setIsTorchOn(!isTorchOn);
      }
    } catch (e) {
      showToast(
        language === 'en'
          ? 'Flashlight is not available on this device.'
          : 'Latarka nie jest dostępna na tym urządzeniu.',
        'info'
      );
    }
  };

  const handleClose = async () => {
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      if (window.history.state?.scannerOpen) {
        window.history.back();
      }
    }
    await stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Pełnoekranowy widok skanera */}
      {!isQuickAddOpen && !isQuickRemoveOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden">
          {/* Górny Pasek Kontrolny */}
          <div className="absolute top-0 inset-x-0 z-40 p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between gap-3">
            {/* Przełącznik Trybu: Dodawanie vs Zużyj vs Szukaj */}
            <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-2xl p-1 border border-slate-700/80 shadow-2xl">
              <button
                type="button"
                onClick={() => setMode('ADD')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  mode === 'ADD' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/60' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {t('common.add')}
              </button>
              <button
                type="button"
                onClick={() => setMode('REMOVE')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  mode === 'REMOVE' ? 'bg-rose-500 text-white shadow-md shadow-rose-950/60' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5" />
                {language === 'en' ? 'Consume' : 'Zużyj'}
              </button>
              {allowSearch && (
                <button
                  type="button"
                  onClick={() => setMode('SEARCH')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    mode === 'SEARCH' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/60' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  {t('common.search')}
                </button>
              )}
            </div>

            {/* Przyciski Akcji: Przełącznik kamery, Latarka, Zamknij */}
            <div className="flex items-center gap-2">
              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="p-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white transition-all"
                  title={t('scanner.switchCamera')}
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleTorch}
                disabled={!isScanning}
                className={`p-2.5 rounded-2xl backdrop-blur-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isTorchOn
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-lg shadow-amber-500/50'
                    : 'bg-slate-900/80 border-slate-700 text-slate-200'
                }`}
                title={isTorchOn ? t('scanner.torchOff') : t('scanner.torchOn')}
              >
                <Flashlight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="p-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-all"
                title={t('common.close')}
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Główny Obszar Kamery / Uprawnień */}
          <div className="relative z-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
            {activeTab === 'camera' ? (
              <>
                {/* Kontener wideo z rozmytym tłem i dopasowanym obrazem w centrum */}
                <div className="absolute inset-0 z-0 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
                  {/* Wyrenderowany strumień wideo ze sztuczką CSS do rozmytego tła */}
                  <div
                    id={scannerContainerId}
                    className="relative w-full h-full flex items-center justify-center
                      [&_video]:relative [&_video]:z-10 [&_video]:!max-w-full [&_video]:!max-h-full [&_video]:!w-auto [&_video]:!h-auto [&_video]:!object-contain [&_video]:rounded-2xl [&_video]:shadow-2xl
                      [&_video]:before:content-['']
                    "
                  />

                  {/* Warstwa rozmywająca i przyciemniająca tło po bokach/górze */}
                  <div className="absolute inset-0 z-0 backdrop-blur-2xl bg-black/60 pointer-events-none" />
                </div>

                {/* Ekran sprawdzania uprawnień */}
                {permissionState === 'checking' && (
                  <div className="absolute inset-0 z-30 bg-slate-950 p-6 flex flex-col items-center justify-center text-center gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white">
                        {language === 'en' ? 'Starting camera' : 'Uruchamianie aparatu'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {language === 'en' ? 'Initializing fast barcode scanner...' : 'Inicjalizacja szybkiego skanera kodów...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ekran Prośby o Uprawnienia do Kamery */}
                {permissionState === 'prompt' && !cameraError && (
                  <div className="absolute inset-0 z-30 bg-slate-950 p-6 flex flex-col items-center justify-center text-center gap-5">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-2xl shadow-emerald-950/80 flex items-center justify-center">
                      <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                        <Camera className="w-10 h-10 text-emerald-400" />
                      </div>
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-xl font-extrabold text-white tracking-tight">
                        {language === 'en' ? 'Enable camera' : 'Włącz aparat w telefonie'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {t('scanner.permissionDesc')}
                      </p>
                    </div>
                    <div className="flex flex-col w-full max-w-xs gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleRequestPermissionClick}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-950/70 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {language === 'en' ? 'Grant access & start scanner' : 'Zezwól i uruchom skaner'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-2xl transition-colors"
                      >
                        {t('scanner.manualInput')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Ekran błędu / zablokowanych uprawnień */}
                {(permissionState === 'denied' || cameraError) && permissionState !== 'checking' && (
                  <div className="absolute inset-0 z-30 bg-slate-950 p-6 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-lg font-bold text-white">{t('scanner.permissionDenied')}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cameraError || (language === 'en' ? 'Camera access is denied. Enable camera in your browser settings.' : 'Dostęp do aparatu został zablokowany. Włącz uprawnienia do kamery w ustawieniach przeglądarki.')}
                      </p>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
                        <div><strong>iOS Safari:</strong> {language === 'en' ? 'Settings → Safari → Camera → Allow' : 'Ustawienia → Safari → Aparat → Zezwól'}</div>
                        <div><strong>Android Chrome:</strong> {language === 'en' ? 'Lock icon next to URL → Permissions → Camera' : 'Ikona kłódki przy adresie → Uprawnienia → Aparat'}</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleRequestPermissionClick}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        {language === 'en' ? 'Try again' : 'Spróbuj ponownie'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                      >
                        {t('scanner.manualInput')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pełnoekranowa ramka i laserowy skaner */}
                {isScanning && !cameraError && permissionState === 'granted' && (
                  <div className="absolute z-20 inset-x-6 sm:inset-x-24 top-1/2 -translate-y-1/2 h-64 sm:h-72 border-2 border-emerald-500/70 rounded-3xl pointer-events-none flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.25)]">
                    <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_16px_#10b981] scanner-laser absolute" />
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                  </div>
                )}
              </>
            ) : (
              /* Widok ręcznego wpisywania */
              <div className="w-full max-w-md p-6 space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="font-extrabold text-white text-lg">
                    {language === 'en' ? 'Enter barcode' : 'Wpisz kod kreskowy'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'en' ? 'Enter EAN-13 / EAN-8 barcode digits' : 'Wprowadź cyfry kodu EAN-13 / EAN-8'}
                  </p>
                </div>
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="np. 5900820000010"
                      className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white font-mono text-lg focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing || !manualCode.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 stroke-[2.5]" />}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Spinner przetwarzania */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-white z-50">
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
                <span className="text-sm font-bold tracking-tight">{t('scanner.searching')}</span>
              </div>
            )}
          </div>

          {/* Dolny Pasek Nawigacyjny Skanera */}
          <div className="absolute bottom-0 inset-x-0 z-40 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col items-center gap-3">
            <p className="text-xs text-slate-300 font-medium text-center drop-shadow-md">
              {mode === 'ADD'
                ? (language === 'en' ? '⚡ Point camera at barcode to add or increase quantity' : '⚡ Skieruj aparat na kod kreskowy, aby dodać lub zwiększyć ilość')
                : mode === 'REMOVE'
                ? (language === 'en' ? '⚡ Scan barcode to instantly deduct pieces from pantry' : '⚡ Zeskanuj kod EAN, aby natychmiast odliczyć sztuki ze spiżarni')
                : (language === 'en' ? '⚡ Scan barcode to filter pantry items' : '⚡ Zeskanuj kod EAN, aby przefiltrować artykuły w spiżarni')}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'camera' ? 'manual' : 'camera')}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-xl"
              >
                {activeTab === 'camera' ? (
                  <>
                    <Keyboard className="w-4 h-4 text-emerald-400" />
                    {t('scanner.manualInput')}
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-emerald-400" />
                    {language === 'en' ? 'Back to camera' : 'Wróć do kamery'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dodawania Produktu */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          onClose();
        }}
        initialProduct={scannedProduct}
        barcode={scannedBarcode}
        onSuccess={() => {
          setIsQuickAddOpen(false);
          onClose();
        }}
      />

      {/* Modal Szybkiego Usuwania */}
      <QuickRemoveModal
        isOpen={isQuickRemoveOpen}
        onClose={() => {
          setIsQuickRemoveOpen(false);
          onClose();
        }}
        barcode={scannedBarcode}
        inPantryItems={inPantryItems}
        productCatalog={scannedProduct}
        onSuccess={() => {
          setIsQuickRemoveOpen(false);
          onClose();
        }}
      />
    </>
  );
};