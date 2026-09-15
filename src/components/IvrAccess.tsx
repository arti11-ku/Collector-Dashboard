import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, X, Mic, MicOff, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useVoiceEngine } from '../services/voiceEngine';
import { MATERIAL_CATEGORIES, type LotItem } from '../types';

interface IvrResponse { sessionId: string; mode: 'DEMO' | 'LIVE'; ivrNumber: string | null; language: string; step: string; prompt: string; lotId?: string; handoverOtp?: string; }

const dialPad = [
  ['1', 'Price'], ['2', 'Sell'], ['3', 'Track'],
  ['4', 'Help'], ['5', ''], ['6', ''],
  ['7', ''], ['8', ''], ['9', 'Repeat'],
  ['*', ''], ['0', ''], ['#', '']
];

export function IvrAccess() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>(i18n.language === 'hi' || i18n.language === 'mr' ? i18n.language : 'en');
  const [session, setSession] = useState<IvrResponse | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const voice = useVoiceEngine(language, value => sendInput(value, language));

  const currentLanguageLabel = useMemo(() => language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Marathi', [language]);

  const startSession = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/ivr/demo/session', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'IVR demo could not start.');
      setSession(data); setHistory([{ role: 'assistant', text: data.prompt }]);
      voice.speak(data.prompt);
    } catch (e: any) {
      setError(e.message || 'IVR demo could not start.');
    } finally {
      setBusy(false);
    }
  };

  async function sendInput(value = input, requestedLanguage = language) {
    const nextValue = String(value || '').trim();
    if (!session || !nextValue || busy) return;
    setBusy(true); setError(''); setInput(''); setHistory(current => [...current, { role: 'user', text: nextValue }]);
    try {
      const response = await fetch('/api/ivr/demo/input', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.sessionId, input: nextValue, language: requestedLanguage }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'IVR request failed.');
      setSession(data);
      setHistory(current => [...current, { role: 'assistant', text: data.prompt }]);
      voice.speak(data.prompt);
    } catch (e: any) {
      setError(e.message || 'IVR request failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!session && !busy) {
      void startSession();
    }
  }, [open]);

  const endCall = () => {
    voice.stopListening();
    voice.stopSpeaking();
    setSession(null);
    setHistory([]);
    setInput('');
    setError('');
    setOpen(false);
  };

  const cycleLanguage = () => {
    const next = language === 'en' ? 'hi' : language === 'hi' ? 'mr' : 'en';
    setLanguage(next);
    if (session) {
      void sendInput('9', next);
    }
  };

  const handleDialKey = async (key: string) => {
    if (!session) {
      await startSession();
      return;
    }
    if (key === '0' || key === '*' || key === '#') {
      await sendInput(key, language);
      return;
    }
    await sendInput(key, language);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    await sendInput(input, language);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-[#2D5A27] border border-[#A5D6A7] rounded-full hover:bg-[#E8F3EA]" aria-label="Open IVR and missed call access">
        <Phone className="w-3.5 h-3.5" /> IVR
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center overflow-y-auto">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto bg-white rounded-3xl shadow-xl border border-[#E0E7E1] p-5 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-[#1D3124]">IVR / Voice</h2>
                <p className="text-sm text-[#5A7A54] mt-1">Voice, keypad, and the same RECYSETU transaction backend.</p>
              </div>
              <button type="button" onClick={endCall} aria-label="End IVR call"><X className="w-5 h-5" /></button>
            </div>

            <div className="mt-4 rounded-xl bg-[#F4FAF4] p-4 text-sm">
              <p>Mode: {session?.mode || 'DEMO'} � {voice.state === 'SPEAKING' ? 'Speaking' : voice.state === 'LISTENING' ? 'Listening' : 'Ready'}</p>
              <p className="font-bold mt-2">{session?.ivrNumber || 'Number not configured yet'}</p>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {voice.error && <p className="mt-3 text-sm text-red-600">{voice.error}</p>}

            {!session ? (
              <div className="mt-5 space-y-4">
                <p className="font-bold text-[#1D3124]">Choose IVR language</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['en', 'hi', 'mr'] as const).map(value => (
                    <button type="button" key={value} onClick={() => setLanguage(value)} className={`p-3 rounded-xl border ${language === value ? 'border-[#2D5A27] bg-[#E8F3EA] font-bold' : 'border-[#E0E7E1]'}`}>
                      {value === 'en' ? 'English' : value === 'hi' ? 'Hindi' : 'Marathi'}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={startSession} disabled={busy} className="w-full bg-[#2D5A27] text-white font-bold py-3 rounded-xl disabled:opacity-60">
                  {busy ? 'Starting...' : 'Start Demo IVR'}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {history.map((entry, index) => (
                    <div key={`${entry.role}-${index}`} className={`rounded-xl p-3 text-sm ${entry.role === 'user' ? 'bg-[#E8F3EA] ml-8' : 'bg-[#F9FBFA] mr-8'}`}>
                      <b>{entry.role === 'user' ? 'You' : 'RECYSETU'}</b>
                      <p>{entry.text}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#E0E7E1] bg-[#F9FBFA] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#5A7A54] font-semibold">Dial pad</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {dialPad.map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void handleDialKey(key)}
                        disabled={busy}
                        className={`min-h-12 rounded-2xl border text-sm font-bold transition-all ${key === '1' || key === '2' || key === '3' || key === '4' || key === '9' ? 'bg-[#E8F3EA] text-[#2D5A27] border-[#A5D6A7]' : 'bg-white text-[#1D3124] border-[#E0E7E1]'} ${busy ? 'opacity-60' : 'hover:bg-[#F1F8F2]'}`}
                        aria-label={`Dial ${key}`}
                      >
                        <span className="block text-lg">{key}</span>
                        {label && <span className="block text-[10px] mt-0.5">{label}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <label className="block text-xs uppercase tracking-wide text-[#5A7A54] font-semibold">Response</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => voice.state === 'LISTENING' ? voice.stopListening() : voice.startListening()} className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${voice.state === 'LISTENING' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-[#F9FBFA] border border-[#E0E7E1] text-[#5A7A54] hover:bg-[#E8F3EA] hover:text-[#2D5A27]'}`} aria-label="Toggle microphone">
                      {voice.state === 'LISTENING' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <input
                      value={input}
                      onChange={event => setInput(event.target.value)}
                      placeholder="Speak or type a response"
                      className="flex-1 bg-[#F9FBFA] border border-[#E0E7E1] rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#A5D6A7] transition-all"
                    />
                    <button type="submit" disabled={!input.trim() || busy} className="shrink-0 bg-[#2D5A27] text-white p-3 rounded-2xl hover:bg-[#1D3124] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" aria-label="Send response">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>

                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={cycleLanguage} className="text-sm font-medium text-[#5A7A54] hover:text-[#2D5A27]">Change language: {currentLanguageLabel}</button>
                  <button type="button" onClick={() => voice.state === 'SPEAKING' ? voice.stopSpeaking() : voice.speak(session?.prompt || 'Welcome to RECYSETU.')} className="text-sm font-medium text-[#2D5A27]">{voice.state === 'SPEAKING' ? 'Stop voice' : 'Replay voice'}</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
