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
    {
      id: 'collector' as Role,
      icon: <User className="w-7 h-7" />,
      title: t('collector'),
      description: t('collector_desc'),
    },
    {
      id: 'aggregator' as Role,
      icon: <Truck className="w-7 h-7" />,
      title: t('aggregator'),
      description: t('aggregator_desc'),
    },
    {
      id: 'recycler' as Role,
      icon: <Recycle className="w-7 h-7" />,
      title: t('recycler'),
      description: t('recycler_desc'),
    },
    {
      id: 'admin' as Role,
      icon: <ShieldCheck className="w-7 h-7" />,
      title: t('admin'),
      description: t('admin_desc'),
    },
  ];

  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-light text-[#1D3124] mb-2">{t('welcome_back')}</h2>
        <p className="text-[#5A7A54]">{t('choose_role')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => handleRoleSelect(role.id)}
            className="bg-white border border-[#E0E7E1] p-6 sm:p-8 rounded-[32px] shadow-[0_4px_20px_rgba(45,90,39,0.05)] hover:border-[#A5D6A7] transition-all cursor-pointer group flex items-start gap-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#F1F8F2] shrink-0 flex items-center justify-center text-[#2D5A27] group-hover:bg-[#2D5A27] group-hover:text-white transition-colors">
              {role.icon}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#1D3124] mb-1">{role.title}</h3>
              <p className="text-sm text-[#5A7A54] leading-relaxed">{role.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
