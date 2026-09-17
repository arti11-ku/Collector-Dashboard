import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { MATERIAL_CATEGORIES } from '../../types';
import { useTransactionDraft } from '../../context/TransactionDraftContext';
import { ArrowLeft, Send, Bot, UserIcon, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceEngine } from '../../services/voiceEngine';

export function Assistant() {
  const { user } = useAuth();
  const { draft, beginDraft, addItem } = useTransactionDraft();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: t('assistant_welcome') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceEngine(i18n.language === 'hi' || i18n.language === 'mr' ? i18n.language : 'en');
  const profileLocation = user?.location || (user?.address ? {
    formattedAddress: user.address,
    latitude: user.latitude,
    longitude: user.longitude
  } : null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (voice.state === 'LISTENING') setInput(voice.interimTranscript || voice.transcript);
  }, [voice.state, voice.interimTranscript, voice.transcript]);

  const speakText = (text: string) => {
    voice.speak(text);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    voice.stopListening();

    const userMessage = input.trim();
    const normalized = userMessage.toLowerCase();
    const digitMap: Record<string, string> = { '५': '5', '३': '3', '२': '2', '१': '1', '४': '4', '६': '6', '७': '7', '८': '8', '९': '9', '०': '0' };
    const normalizedDigits = normalized.replace(/[०-९]/g, digit => digitMap[digit] || digit);
    const materialAliases: Record<string, string[]> = { mobile: ['mobile', 'मोबाइल', 'मोबाईल'], laptop: ['laptop', 'लैपटॉप', 'लॅपटॉप'], battery: ['battery', 'बैटरी', 'बॅटरी'], pcb: ['pcb'], copper: ['copper', 'तांबा'], aluminium: ['aluminium', 'aluminum', 'एल्युमिनियम'], iron: ['iron', 'लोहे', 'लोहा'] };
    const detected = Object.entries(materialAliases).flatMap(([materialId, aliases]) => {
      const alias = aliases.find(value => normalized.includes(value));
      if (!alias) return [];
      const match = normalizedDigits.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:kg|kilo|किलो)?\\s*(?:' + alias + ')', 'i')) || normalizedDigits.match(new RegExp('(?:' + alias + ')\\s*(?:का|की|के)?\\s*(\\d+(?:\\.\\d+)?)', 'i'));
      return match ? [{ materialId, weight: Number(match[1]) }].filter(item => item.weight > 0) : [];
    });
    const customMatch = normalizedDigits.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|किलो)?\s*(server equipment|server|old server|television|tv|electronic equipment)/i);
    if (detected.length > 0) {
      beginDraft('assistant');
      detected.forEach(item => { if (!draft?.items.some(existing => existing.materialId === item.materialId && existing.declaredWeight === item.weight)) { const category = MATERIAL_CATEGORIES.find(entry => entry.id === item.materialId); if (category) addItem({ materialId: category.id, materialName: category.name, declaredWeight: item.weight, unit: 'kg' }); } });
    }
    if (customMatch) {
      beginDraft('assistant');
      const customName = customMatch[2].replace(/\b\w/g, letter => letter.toUpperCase());
      const customWeight = Number(customMatch[1]);
      if (!draft?.items.some(item => item.materialId === 'other' && item.materialName?.toLowerCase() === customName.toLowerCase() && item.declaredWeight === customWeight)) {
        addItem({ materialId: 'other', materialName: customName, declaredWeight: customWeight, unit: 'kg' });
      }
    }
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          language: i18n.language,
          history: messages,
          draft,
          location: profileLocation
        })
      });
      
      if (!res.ok) { const failure = await res.json().catch(() => ({})); throw new Error(failure.error || 'The assistant service returned an error.'); }
      const data = await res.json();
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('The assistant returned an empty response. Please try again.');
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply.trim() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: error instanceof Error ? error.message : 'The assistant service returned an error.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-4 -mx-4 sm:mx-0 sm:mt-0 bg-[#F9FBFA]">
      <div className="bg-gradient-to-r from-[#2D5A27] to-[#1D3124] p-4 text-white shadow-md z-10 shrink-0">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/collector/dashboard')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-lg leading-tight">RECYSETU Assistant</h2>
            <p className="text-xs text-[#A5D6A7]">{t('Always here to help')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-[#2D5A27] ml-2' : 'bg-white border border-[#E0E7E1] mr-2'}`}>
                {msg.role === 'user' ? <UserIcon className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-[#2D5A27]" />}
              </div>
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-[#2D5A27] text-white rounded-tr-sm' 
                    : 'bg-white border border-[#E0E7E1] text-[#1D3124] rounded-tl-sm shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => speakText(msg.content)}
                    className="mt-1 flex items-center text-xs text-[#5A7A54] hover:text-[#2D5A27] transition-colors"
                  >
                    <Volume2 className="w-3 h-3 mr-1" /> {t('Listen')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] flex-row">
              <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-[#E0E7E1] mr-2 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#2D5A27]" />
              </div>
              <div className="bg-white border border-[#E0E7E1] rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#A5D6A7] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#5A7A54] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-[#2D5A27] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-[#E0E7E1] shrink-0">
        {voice.error && <p className="mb-2 text-sm text-red-600">{voice.error}</p>}
        <form onSubmit={handleSend} className="flex space-x-2">
          <button 
            type="button" 
            onClick={() => voice.state === 'LISTENING' ? voice.stopListening() : voice.startListening()}
            className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${voice.state === 'LISTENING' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-[#F9FBFA] border border-[#E0E7E1] text-[#5A7A54] hover:bg-[#E8F3EA] hover:text-[#2D5A27]'}`}
          >
            {voice.state === 'LISTENING' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={voice.state === 'LISTENING' ? t("Listening...") : t("Type your message...")}
            className="flex-1 bg-[#F9FBFA] border border-[#E0E7E1] rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#A5D6A7] transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 bg-[#2D5A27] text-white p-3 rounded-2xl hover:bg-[#1D3124] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
