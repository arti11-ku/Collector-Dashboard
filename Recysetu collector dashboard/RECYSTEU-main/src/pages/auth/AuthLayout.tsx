import React from 'react';
import { Outlet } from 'react-router';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Leaf } from 'lucide-react';

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F9FBFA] text-[#1D3124] flex flex-col relative overflow-hidden font-sans">
      {/* Organic Background Blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#E8F3E9] rounded-full blur-[80px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-50px] right-[-50px] w-[300px] h-[300px] bg-[#F1F5E9] rounded-full blur-[60px] opacity-60 pointer-events-none" />
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center px-6 sm:px-12 py-6 sm:py-8 z-10 gap-4">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <img
            src="/RecySetu%20Logo.png"
            alt="RecySetu logo"
            className="h-32 sm:h-40 w-auto object-contain"
          />
        </div>
        <div className="flex gap-4 items-center">
          <LanguageSwitcher />
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:px-12 z-10 w-full mx-auto">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-12 py-8 flex flex-col items-center justify-center gap-4 z-10">
        <div className="flex items-center gap-2 text-[#5A7A54] text-xs font-medium bg-[#F1F5F2] px-4 py-2 rounded-full border border-[#E0E7E1]">
          <Leaf className="w-4 h-4" />
          <span>{t('mission_statement')}</span>
        </div>
        <div className="text-[10px] text-[#A5B2A7] uppercase tracking-widest flex flex-wrap justify-center gap-4 sm:gap-6">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>© {new Date().getFullYear()} RECYSETU</span>
        </div>
      </footer>
    </div>
  );
}
