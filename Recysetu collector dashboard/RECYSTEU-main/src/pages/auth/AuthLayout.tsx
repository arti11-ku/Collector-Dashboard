import React from 'react';
import { Outlet } from 'react-router';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eefaf3] font-sans text-[#1D3124]">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-end px-4 pt-3 sm:px-6 lg:px-8">
        <LanguageSwitcher />
      </header>

      <main className="relative z-10 flex min-h-screen items-stretch justify-stretch px-0 pb-0 pt-0">
        <Outlet />
      </main>
    </div>
  );
}
