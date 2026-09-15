import React from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Leaf, Laptop, Recycle, ShieldCheck, Smartphone, Truck, User, UserRound } from 'lucide-react';
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

  return <div className="auth-landing">
    <section className="auth-brand-panel">
      <div className="auth-circuit auth-circuit-left" />
      <div className="auth-circuit auth-circuit-right" />
      <svg className="auth-recycle-ring" viewBox="0 0 520 520" aria-hidden="true"><path d="M260 40a220 220 0 0 1 190 110" /><path d="M460 150l-7-55-49 28" /><path d="M450 290a220 220 0 0 1-128 168" /><path d="M322 458l54 12-14-55" /><path d="M165 430A220 220 0 0 1 70 270" /><path d="M70 270l-38 41 56 3" /><circle cx="260" cy="260" r="174" /></svg>
      <div className="auth-leaf auth-leaf-one"><Leaf /></div><div className="auth-leaf auth-leaf-two"><Leaf /></div><div className="auth-leaf auth-leaf-three"><Leaf /></div><div className="auth-leaf auth-leaf-four"><Leaf /></div><div className="auth-leaf auth-leaf-five"><Leaf /></div>
      <div className="auth-brand-content">
        <div className="auth-eco-badge"><Leaf /> Eco-first platform</div>
        <div className="auth-logo-wrap"><img src="/RecySetu%20Logo.png" alt="RecySetu logo" /><p>CONNECT • COLLECT • RECYCLE</p></div>
        <div className="auth-message"><h2>Turning e-waste<br />into <span>opportunity.</span></h2><p>Empowering collectors. Connecting recyclers.<br />Protecting tomorrow.</p></div>
        <div className="auth-ecosystem"><div><UserRound /><b>Collector</b><small>Collect &amp; Earn</small></div><i>→</i><div><Truck /><b>Aggregator</b><small>Connect &amp; Consolidate</small></div><i>→</i><div><Recycle /><b>Recycler</b><small>Recover &amp; Recycle</small></div></div>
        <div className="auth-ewaste"><Laptop /><Smartphone /><span className="auth-board" /><span className="auth-leaf-cluster"><Leaf /><Leaf /><Leaf /></span></div>
        <p className="auth-mission-note">A Cleaner<br />Greener India</p>
      </div>
    </section>
    <section className="auth-access-panel">
      <div className="auth-background-leaf auth-background-leaf-top" /><div className="auth-background-leaf auth-background-leaf-bottom" />
      <div className="auth-access-content"><div className="auth-access-heading"><h1>Welcome back</h1><p>{t('choose_role')}</p></div><div className="auth-role-grid">{roles.map((role, index) => <button key={role.id} type="button" onClick={() => handleRoleSelect(role.id)} className={`auth-role-card ${index === 0 ? 'auth-role-card-primary' : ''}`}><span className="auth-role-icon">{role.icon}</span><span className="auth-role-copy"><strong>{role.title}</strong><small>{role.description}</small></span><ArrowRight className="auth-role-arrow" /></button>)}</div><div className="auth-tomorrow"><Leaf /><div><strong>Together for a Circular Tomorrow</strong><small>Responsible E-Waste Management for a Better, Greener India.</small></div><span>• • •</span></div></div>
    </section>
  </div>;
}