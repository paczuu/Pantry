import { useState, useEffect, useRef, useCallback } from 'react';
import { parsePolishVoiceDate } from '../utils/speechDateParser';
import { useToast } from '../contexts/ToastContext';

export const useVoiceExpiry = (onDateDetected: (dateStr: string) => void) => {
  const { showToast, playBeep, vibrate } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onDateDetectedRef = useRef(onDateDetected);
  const showToastRef = useRef(showToast);
  const playBeepRef = useRef(playBeep);
  const vibrateRef = useRef(vibrate);
  const transcriptRef = useRef('');
  const dateDetectedRef = useRef(false);

  useEffect(() => {
    onDateDetectedRef.current = onDateDetected;
  }, [onDateDetected]);

  useEffect(() => {
    showToastRef.current = showToast;
    playBeepRef.current = playBeep;
    vibrateRef.current = vibrate;
  }, [showToast, playBeep, vibrate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'pl-PL';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      dateDetectedRef.current = false;
      transcriptRef.current = '';
      setIsListening(true);
      setSpokenTranscript('');

      try {
        playBeepRef.current?.(650, 'sine', 0.1);
      } catch (e) {}

      try {
        vibrateRef.current?.(30);
      } catch (e) {}
    };

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      let hasFinalResult = false;

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];

        if (result?.[0]?.transcript) {
          fullTranscript += `${result[0].transcript} `;
        }

        if (result.isFinal) {
          hasFinalResult = true;
        }
      }

      fullTranscript = fullTranscript.trim();

      transcriptRef.current = fullTranscript;
      setSpokenTranscript(fullTranscript);

      if (!hasFinalResult || dateDetectedRef.current) return;

      const parsedDate = parsePolishVoiceDate(fullTranscript);

      if (parsedDate) {
        dateDetectedRef.current = true;
        onDateDetectedRef.current(parsedDate);

        try {
          playBeepRef.current?.(880, 'sine', 0.15);
        } catch (e) {}

        try {
          vibrateRef.current?.([40, 30, 40]);
        } catch (e) {}

        const [year, month, day] = parsedDate.split('-').map(Number);
        const formattedDate = year && month && day
          ? new Date(year, month - 1, day).toLocaleDateString('pl-PL')
          : parsedDate;

        showToastRef.current?.(`Rozpoznano datę: ${formattedDate}`, 'success');

        try {
          recognition.stop();
        } catch (e) {}
      } else {
        showToastRef.current?.(
          `Nie rozpoznano daty z wypowiedzi: "${fullTranscript}". Spróbuj np. "za 3 dni", "15 maja" albo "31 grudnia".`,
          'warning'
        );
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error, event);

      isListeningRef.current = false;
      setIsListening(false);

      if (event.error === 'aborted') return;

      if (event.error === 'no-speech') {
        showToastRef.current?.('Nie wykryto mowy. Naciśnij mikrofon i powiedz datę jeszcze raz.', 'warning');
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        showToastRef.current?.('Brak dostępu do mikrofonu. Zezwól aplikacji na używanie mikrofonu w ustawieniach przeglądarki.', 'error');
        return;
      }

      if (event.error === 'audio-capture') {
        showToastRef.current?.('Nie udało się uruchomić mikrofonu. Sprawdź, czy nie korzysta z niego inna aplikacja.', 'error');
        return;
      }

      if (event.error === 'network') {
        showToastRef.current?.('Rozpoznawanie mowy wymaga połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.', 'warning');
        return;
      }

      showToastRef.current?.('Nie udało się rozpoznać mowy. Spróbuj ponownie.', 'warning');
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.abort();
      } catch (e) {}

      recognitionRef.current = null;
      isListeningRef.current = false;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      showToastRef.current?.('Wprowadzanie głosowe nie jest obsługiwane przez tę przeglądarkę.', 'warning');
      return;
    }

    if (isListeningRef.current) return;

    transcriptRef.current = '';
    dateDetectedRef.current = false;
    setSpokenTranscript('');

    try {
      recognitionRef.current.start();
    } catch (error: any) {
      console.error('Error starting speech recognition:', error);

      if (error?.name === 'InvalidStateError') {
        try {
          recognitionRef.current.abort();

          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.error('Error restarting speech recognition:', e);
            }
          }, 150);
        } catch (e) {}

        return;
      }

      showToastRef.current?.('Nie udało się uruchomić mikrofonu.', 'error');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (e) {}

    isListeningRef.current = false;
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    isSupported,
    spokenTranscript,
    toggleListening,
    startListening,
    stopListening,
  };
};