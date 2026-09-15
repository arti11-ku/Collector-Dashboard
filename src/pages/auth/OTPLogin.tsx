import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function OTPLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'collector';
  const { setUser } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prototypeOtp, setPrototypeOtp] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setError('Please enter a valid mobile number.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, role })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request OTP');
      
      setPrototypeOtp(data.prototypeOTP);
      setStep(2);
      setCountdown(30);
    } catch (err: any) {
      setError(err.message || t('network_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, role })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error?.includes('expired')) {
          throw new Error(t('expired_otp'));
        } else if (data.error?.includes('Too many attempts')) {
          throw new Error(t('too_many_attempts'));
        } else if (data.error?.includes('incorrect')) {
          throw new Error(t('invalid_otp'));
        }
        throw new Error(data.error || 'Verification failed');
      }
      
      if (data.needsOnboarding) {
        navigate(`/auth/onboarding?role=${data.role}&mobile=${data.mobile}`);
        return;
      }
      
      setUser(data.user);
      navigate(`/${data.user.role}`);
    } catch (err: any) {
      setError(err.message || t('network_error'));
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role === 'collector' ? t('collector') : role === 'aggregator' ? t('aggregator') : role === 'recycler' ? t('recycler') : t('admin');

  return (
    <div className="auth-login-shell">
      <div className="auth-login-decoration auth-login-decoration-left" />
      <div className="auth-login-decoration auth-login-decoration-right" />
      <div className="auth-login-leaf auth-login-leaf-top-left"><Leaf /></div>
      <div className="auth-login-leaf auth-login-leaf-top-right"><Leaf /></div>
      <div className="auth-login-leaf auth-login-leaf-mid-left"><Leaf /></div>
      <div className="auth-login-leaf auth-login-leaf-mid-right"><Leaf /></div>
      <div className="auth-login-left-story" aria-hidden="true"><span className="auth-login-eco-pill"><Leaf /> Eco-first platform</span><p className="auth-login-story-kicker">RECYSETU</p><p className="auth-login-story-tagline">CONNECT • COLLECT • RECYCLE</p><h2>Small Actions.<br /><strong>Big Change.</strong></h2><p>Together for a cleaner,<br />greener India.</p><div className="auth-login-impact"><span><Leaf /><b>Collect</b><small>E-waste</small></span><span><i>↻</i><b>Enable</b><small>Recycling</small></span><span><i>◉</i><b>Empower</b><small>Livelihoods</small></span></div></div>
      <div className="auth-login-ewaste" aria-hidden="true"><span className="auth-login-laptop" /><span className="auth-login-phone" /><span className="auth-login-board" /><span className="auth-login-drive" /><span className="auth-login-e-waste-leaf"><Leaf /><Leaf /><Leaf /></span></div>
      <div className="auth-login-right-story" aria-hidden="true"><span>Reduce</span><span>Reuse</span><span>Recycle</span><span>Recover</span><span>Together</span><b /></div>
      <div className="auth-login-map" aria-hidden="true" />
      <div className="auth-login-landscape" aria-hidden="true"><span className="auth-login-hills" /><span className="auth-login-city" /><span className="auth-login-windmill" /></div>
      <svg className="auth-login-ring" viewBox="0 0 440 440" aria-hidden="true"><path d="M220 30a190 190 0 0 1 160 88" /><path d="M380 118l-7-48-43 25" /><path d="M365 265a190 190 0 0 1-115 134" /><path d="M250 399l48 10-12-47" /><path d="M112 350A190 190 0 0 1 40 205" /><path d="M40 205l-28 37 48 2" /></svg>
      <div className="auth-login-card">
        <div className="auth-login-topline"><button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="auth-login-back" aria-label={t('back')}><ArrowLeft /></button><span>{roleLabel} access</span><span className="auth-login-status"><ShieldCheck /> Secure</span></div>
        <div className="auth-login-brand"><img src="/RecySetu%20Logo.png" alt="RecySetu logo" /><span><Leaf /> Secure RECYSETU access</span></div>
        <div className="auth-login-heading"><p className="auth-login-context">{roleLabel.toUpperCase()} ACCESS</p><h1>{roleLabel} Login</h1><p>Secure access to your RECYSETU account</p></div>

        <div className="auth-login-body">
        {error && (
          <div className="auth-login-error">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="auth-login-form">
            <div>
              <label htmlFor="mobile" className="auth-login-label">
                {t('mobile_number')}
              </label>
              <div className="auth-login-input-wrap">
                <span>+91</span>
                <input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  className="auth-login-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={loading}
                  maxLength={10}
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || mobile.length !== 10}
              className="auth-login-button"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('send_otp')} <span>→</span></>}
            </button>
            <p className="auth-login-security">Your mobile number is used only to securely access your RecySetu account.</p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="auth-login-form">
            <div className="auth-login-verify-heading">
              <h3>{t('verify_mobile')}</h3>
              
              {/* PROTOTYPE OTP DISPLAY */}
              <div className="auth-login-demo-otp">
                <p>{t('demo_mode_notice')}</p><span>{t('prototype_otp_notice')}</span><strong>{prototypeOtp}</strong>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="--- ---"
                className="auth-login-input auth-login-otp-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="auth-login-button"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('verify_login')}
            </button>

            <div className="text-center">
              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={() => handleRequestOTP()}
                className="auth-login-resend"
              >
                {countdown > 0 ? t('resend_otp_in', { seconds: countdown }) : t('resend_otp')}
              </button>
            </div>
          </form>
        )}
        </div>
        <p className="auth-login-footer">One secure step into a circular future.</p>
      </div>
    </div>
  );
}
