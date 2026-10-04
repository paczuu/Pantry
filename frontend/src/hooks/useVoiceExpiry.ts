import { useState, useEffect, useRef, useCallback } from 'react';
import { parseVoiceDate } from '../utils/speechDateParser';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';

export const useVoiceExpiry = (onDateDetected: (dateStr: string) => void) => {
  const { showToast, playBeep, vibrate } = useToast();
  const { language } = useLanguage();
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
  const languageRef = useRef(language);

  useEffect(() => {
    onDateDetectedRef.current = onDateDetected;
  }, [onDateDetected]);

  useEffect(() => {
    languageRef.current = language;
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'en' ? 'en-US' : 'pl-PL';
    }
  }, [language]);

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
    recognition.lang = languageRef.current === 'en' ? 'en-US' : 'pl-PL';
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

      const currentLang = languageRef.current;
      const parsedDate = parseVoiceDate(fullTranscript, currentLang);

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
          ? new Date(year, month - 1, day).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'pl-PL')
          : parsedDate;

        showToastRef.current?.(
          currentLang === 'en'
            ? `Detected expiry date: ${formattedDate}`
            : `Rozpoznano datę: ${formattedDate}`,
          'success'
        );

        try {
          recognition.stop();
        } catch (e) {}
      } else {
        showToastRef.current?.(
          currentLang === 'en'
            ? `Could not detect date from: "${fullTranscript}". Try e.g. "in 3 days", "May 15" or "December 31".`
            : `Nie rozpoznano daty z wypowiedzi: "${fullTranscript}". Spróbuj np. "za 3 dni", "15 maja" albo "31 grudnia".`,
          'warning'
        );
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error, event);

      isListeningRef.current = false;
      setIsListening(false);

      if (event.error === 'aborted') return;

      const currentLang = languageRef.current;

      if (event.error === 'no-speech') {
        showToastRef.current?.(
          currentLang === 'en'
            ? 'No speech detected. Tap microphone and say the date again.'
            : 'Nie wykryto mowy. Naciśnij mikrofon i powiedz datę jeszcze raz.',
          'warning'
        );
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        showToastRef.current?.(
          currentLang === 'en'
            ? 'Microphone access denied. Please grant microphone permissions in browser settings.'
            : 'Brak dostępu do mikrofonu. Zezwól aplikacji na używanie mikrofonu w ustawieniach przeglądarki.',
          'error'
        );
        return;
      }

      if (event.error === 'audio-capture') {
        showToastRef.current?.(
          currentLang === 'en'
            ? 'Could not access microphone. Ensure no other application is using it.'
            : 'Nie udało się uruchomić mikrofonu. Sprawdź, czy nie korzysta z niego inna aplikacja.',
          'error'
        );
        return;
      }

      if (event.error === 'network') {
        showToastRef.current?.(
          currentLang === 'en'
            ? 'Speech recognition requires an internet connection.'
            : 'Rozpoznawanie mowy wymaga połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.',
          'warning'
        );
        return;
      }

      showToastRef.current?.(
        currentLang === 'en'
          ? 'Failed to recognize speech. Please try again.'
          : 'Nie udało się rozpoznać mowy. Spróbuj ponownie.',
        'warning'
      );
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
      showToastRef.current?.(
        languageRef.current === 'en'
          ? 'Voice input is not supported in this browser.'
          : 'Wprowadzanie głosowe nie jest obsługiwane przez tę przeglądarkę.',
        'warning'
      );
      return;
    }

    if (isListeningRef.current) return;

    transcriptRef.current = '';
    dateDetectedRef.current = false;
    setSpokenTranscript('');

    try {
      recognitionRef.current.lang = languageRef.current === 'en' ? 'en-US' : 'pl-PL';
      recognitionRef.current.start();
    } catch (error: any) {
      console.error('Error starting speech recognition:', error);

      if (error?.name === 'InvalidStateError') {
        try {
          recognitionRef.current.abort();

          setTimeout(() => {
            try {
              recognitionRef.current.lang = languageRef.current === 'en' ? 'en-US' : 'pl-PL';
              recognitionRef.current?.start();
            } catch (e) {
              console.error('Error restarting speech recognition:', e);
            }
          }, 150);
        } catch (e) {}

        return;
      }

      showToastRef.current?.(
        languageRef.current === 'en'
          ? 'Could not start microphone.'
          : 'Nie udało się uruchomić mikrofonu.',
        'error'
      );
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