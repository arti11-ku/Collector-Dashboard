import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <div className="flex bg-white/50 border border-[#E0E7E1] rounded-full px-4 py-1.5 text-xs font-medium">
      <button 
        onClick={() => changeLanguage('en')}
        className={`px-2 transition-colors ${i18n.language === 'en' ? 'text-[#2D5A27] font-bold' : 'text-[#5A7A54] hover:text-[#2D5A27]'}`}
      >
        EN
      </button>
      <span className="text-[#C8D1C9]">|</span>
      <button 
        onClick={() => changeLanguage('hi')}
        className={`px-2 transition-colors ${i18n.language === 'hi' ? 'text-[#2D5A27] font-bold' : 'text-[#5A7A54] hover:text-[#2D5A27]'}`}
      >
        हिन्दी
      </button>
      <span className="text-[#C8D1C9]">|</span>
      <button 
        onClick={() => changeLanguage('mr')}
        className={`px-2 transition-colors ${i18n.language === 'mr' ? 'text-[#2D5A27] font-bold' : 'text-[#5A7A54] hover:text-[#2D5A27]'}`}
      >
        मराठी
      </button>
    </div>
  );
}
