import { useEffect, useRef, useState } from 'react';

type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';
type VoiceLanguage = 'en' | 'hi' | 'mr';

const languageCodes: Record<VoiceLanguage, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

function pickFemaleVoice(language: VoiceLanguage) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const languagePrefix = languageCodes[language].slice(0, 2).toLowerCase();
  const preferredNames = {
    en: ['female', 'woman', 'girl', 'samantha', 'zira', 'susan', 'victoria', 'aria', 'jenny', 'susan', 'karen'],
    hi: ['female', 'woman', 'girl', 'kavya', 'veena', 'aarti', 'heera'],
    mr: ['female', 'woman', 'girl', 'sahaja', 'kavya', 'veena', 'aarti']
  }[language];

  const matches = voices.filter(voice => {
    const lang = (voice.lang || '').toLowerCase();
    const name = (voice.name || '').toLowerCase();
    const sameLanguage = lang.startsWith(languagePrefix);
    const femaleHint = preferredNames.some(term => name.includes(term));
    return sameLanguage && femaleHint;
  });

  if (matches[0]) return matches[0];

  const fallbackByLanguage = voices.filter(voice => (voice.lang || '').toLowerCase().startsWith(languagePrefix));
  if (fallbackByLanguage[0]) return fallbackByLanguage[0];

  const enFallback = voices.filter(voice => (voice.lang || '').toLowerCase().startsWith('en'));
  if (enFallback[0]) return enFallback[0];

  return voices[0] || null;
}

export function useVoiceEngine(language: VoiceLanguage, onTurnComplete?: (text: string) => void) {
  const recognitionRef = useRef<any>(null);
  const activeRef = useRef(false);
  const transcriptRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onTurnComplete);
  const speechStartedRef = useRef(false);
  const [state, setState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { callbackRef.current = onTurnComplete; }, [onTurnComplete]);
  useEffect(() => () => {
    activeRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const finishTurn = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const value = transcriptRef.current.trim();
    if (!value) return;
    activeRef.current = false;
    recognitionRef.current?.stop();
    setTranscript(value); setInterimTranscript(''); setState('PROCESSING');
    callbackRef.current?.(value);
  };

  const startListening = () => {
    if (state === 'LISTENING' || state === 'PROCESSING' || state === 'SPEAKING') return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setError('Speech recognition is not supported in this browser. You can use text or the keypad instead.');
      setState('ERROR');
      return;
    }
    if (!recognitionRef.current) recognitionRef.current = new Recognition();
    const recognition = recognitionRef.current;
    recognition.lang = languageCodes[language];
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError('');
    activeRef.current = true;

    recognition.onstart = () => setState('LISTENING');
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const part = event.results[index][0].transcript;
        if (event.results[index].isFinal) transcriptRef.current += `${part} `;
        else interim += part;
      }
      setTranscript(transcriptRef.current.trim());
      setInterimTranscript(interim);
      if (transcriptRef.current.trim()) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(finishTurn, 1400);
      }
    };
    recognition.onerror = (event: any) => {
      activeRef.current = false;
      setState('ERROR');
      const reasons: Record<string, string> = {
        'not-allowed': 'Microphone permission was denied. Allow microphone access and try again.',
        'audio-capture': 'No microphone is available. Check your device input and try again.',
        'no-speech': 'No speech was detected. Press Speak and try again.',
        network: 'Speech recognition needs a network connection. You can type instead.',
        'service-not-allowed': 'Speech recognition is blocked by this browser. You can type instead.'
      };
      if (event.error !== 'aborted') setError(reasons[event.error] || `Speech recognition error: ${event.error || 'unknown error'}.`);
    };
    recognition.onend = () => {
      if (activeRef.current) {
        try { recognition.start(); } catch { /* browser is already restarting */ }
      } else if (state !== 'PROCESSING') setState('IDLE');
    };

    try {
      recognition.start();
    } catch {
      setError('Microphone is already active. Try again in a moment.');
      setState('ERROR');
      activeRef.current = false;
    }
  };

  const stopListening = () => {
    activeRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setInterimTranscript('');
    setState('IDLE');
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window) || !text) {
      setError('Speech output is unavailable in this browser. The response is still shown as text.');
      return;
    }

    stopListening();
    setError('');
    speechStartedRef.current = false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCodes[language];
    const preferredVoice = pickFemaleVoice(language);
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1;
    utterance.pitch = 1.15;
    utterance.volume = 1;

    utterance.onstart = () => {
      speechStartedRef.current = true;
      setState('SPEAKING');
    };
    utterance.onend = () => setState('IDLE');
    utterance.onerror = () => {
      if (!speechStartedRef.current) {
        setState('IDLE');
        setError('');
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setState('IDLE');
  };

  return { state, transcript, interimTranscript, error, startListening, stopListening, speak, stopSpeaking, markProcessed: () => setState('IDLE') };
}
