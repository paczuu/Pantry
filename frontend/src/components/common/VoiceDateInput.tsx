import React from 'react';
import { Loader2, Mic } from 'lucide-react';
import { useLanguage } from '../../language/LanguageContext';
import { useVoiceExpiry } from '../../hooks/useVoiceExpiry';
import { Input } from '../ui/FormControls';
import { cn } from '../../utils/cn';

interface VoiceDateInputProps {
  /** ISO date (`YYYY-MM-DD`) or an empty string. */
  value: string;
  onChange: (value: string) => void;
  /** State returned by `useVoiceExpiry`; the parent owns the hook so it can stop listening on submit. */
  voice: ReturnType<typeof useVoiceExpiry>;
}

/** Date field with a "speak the date" microphone button and a live transcript while listening. */
export const VoiceDateInput: React.FC<VoiceDateInputProps> = ({ value, onChange, voice }) => {
  const { t } = useLanguage();
  const { isListening, isSupported, spokenTranscript, toggleListening } = voice;

  return (
    <>
      <div className="flex items-center gap-2">
        <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0" />

        {isSupported && (
          <button
            type="button"
            onClick={toggleListening}
            title={t('pantry.voiceHint')}
            className={cn(
              'p-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs shrink-0',
              isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/60 animate-pulse ring-2 ring-rose-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            )}
          >
            <Mic className={cn('w-4 h-4', isListening ? 'animate-bounce' : 'text-emerald-400')} />
            <span className="hidden sm:inline">{isListening ? t('pantry.listening') : t('pantry.speakDate')}</span>
          </button>
        )}
      </div>

      {isListening && (
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="break-words min-w-0">
            {spokenTranscript ? `${t('pantry.listening')} "${spokenTranscript}"` : t('pantry.voiceHint')}
          </span>
        </div>
      )}
    </>
  );
};
