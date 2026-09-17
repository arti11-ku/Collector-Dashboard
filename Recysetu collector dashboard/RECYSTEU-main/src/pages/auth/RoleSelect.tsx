import React from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Truck, Recycle, ShieldCheck, User } from 'lucide-react';
import { Role } from '../../types';

export function RoleSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleRoleSelect = (role: Role) => {
    if (role === 'collector' || role === 'aggregator') {
      navigate(`/auth/login-otp?role=${role}`);
    } else {
      navigate(`/auth/login-password?role=${role}`);
    }
  };

  const roles = [
    { id: 'collector' as Role, icon: <User className="w-7 h-7" />, title: t('collector'), description: t('collector_desc') },
    { id: 'aggregator' as Role, icon: <Truck className="w-7 h-7" />, title: t('aggregator'), description: t('aggregator_desc') },
    { id: 'recycler' as Role, icon: <Recycle className="w-7 h-7" />, title: t('recycler'), description: t('recycler_desc') },
    { id: 'admin' as Role, icon: <ShieldCheck className="w-7 h-7" />, title: t('admin'), description: t('admin_desc') },
  ];

  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      <div
        className="relative isolate min-h-[620px] overflow-hidden bg-[#b9d8c0] bg-cover bg-center bg-no-repeat lg:min-h-screen"
        style={{ backgroundImage: "url('/Recysetu_left_image.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#163d2a]/10 via-transparent to-[#163d2a]/35" />
        <div className="relative z-10 flex h-full min-h-[620px] flex-col justify-between p-6 sm:p-9 lg:min-h-screen lg:p-12">
          <div className="flex justify-center pt-3 lg:justify-start">
            <div className="rounded-full border border-white/50 bg-white/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-sm">
              Eco-first platform
            </div>
          </div>
          <div className="flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
            <img src="/RecySetu%20Logo.png" alt="RecySetu logo" className="h-20 w-auto object-contain drop-shadow-[0_14px_26px_rgba(18,52,29,0.28)] sm:h-24 lg:h-28" />
            <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-white drop-shadow-sm">CONNECT • COLLECT • RECYCLE</div>
          </div>
          <div className="pb-2 text-center lg:text-left">
            <div className="text-[clamp(2.2rem,4vw,3.5rem)] font-semibold leading-[0.95] text-white drop-shadow-[0_3px_12px_rgba(16,53,31,0.32)]">
              Small<span className="block">Actions.</span><span className="block">Big Change.</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/90 drop-shadow-sm">A greener India is a brighter tomorrow.</p>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden bg-[#f5faf6] px-5 py-12 sm:px-8 lg:px-12 lg:py-10">
        <div className="pointer-events-none absolute -right-24 bottom-[-7rem] h-64 w-64 rotate-[-18deg] rounded-[55%_45%_60%_40%] border-[28px] border-[#dfeee2]/80" />
        <div className="pointer-events-none absolute right-[12%] top-[16%] h-16 w-28 rotate-[24deg] rounded-[70%_30%_70%_30%] bg-[#e3f0e4]/80" />
        <div className="relative w-full max-w-[580px]">
          <div className="mb-7 text-center sm:mb-8">
            <h1 className="text-3xl font-semibold tracking-[-0.06em] text-[#1D3124] sm:text-[2.8rem]">Welcome back</h1>
            <p className="mt-2 text-sm text-[#5A7A54] sm:text-base">{t('choose_role')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {roles.map((role) => (
              <button key={role.id} type="button" onClick={() => handleRoleSelect(role.id)} className="group flex items-start gap-4 rounded-[24px] border border-[#DDEAE1] bg-[#ffffff] p-4 text-left shadow-[0_12px_30px_rgba(19,44,28,0.05)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[#AAD9B1] hover:shadow-[0_18px_40px_rgba(22,72,41,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#edf8f0] text-[#2D5A27] transition-colors duration-200 group-hover:bg-[#2D5A27] group-hover:text-white">{role.icon}</div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight text-[#1D3124]">{role.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5A7A54]">{role.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}