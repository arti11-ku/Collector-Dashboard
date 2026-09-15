import React from 'react';
import { Outlet } from 'react-router';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export function AuthLayout() {
  return (
    <div className="auth-page relative w-full min-h-screen min-h-[100dvh] overflow-hidden font-sans text-[#123528]">
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-end px-5 pt-5 sm:px-8 lg:px-12 lg:pt-7">
        <LanguageSwitcher />
      </header>

      <main className="relative z-10 flex w-full min-h-screen min-h-[100dvh] items-stretch justify-stretch px-0 pb-0 pt-0">
        <Outlet />
      </main>
    </div>
  );
}
