import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
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

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-[#E0E7E1] shadow-[0_4px_20px_rgba(45,90,39,0.05)] rounded-[32px] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E0E7E1] flex items-center">
        <button 
          onClick={() => step === 2 ? setStep(1) : navigate(-1)}
          className="text-[#5A7A54] hover:text-[#2D5A27] transition-colors mr-3"
          aria-label={t('back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-[#1D3124]">
          {role === 'collector' ? t('collector_login') : t('aggregator_login')}
        </h2>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm p-3 rounded-[16px] border border-red-100">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-[#1D3124] mb-2">
                {t('mobile_number')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A7A54] font-medium">+91</span>
                <input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#E0E7E1] rounded-xl focus:ring-2 focus:ring-[#A5D6A7] focus:border-transparent outline-none transition-all text-[#1D3124]"
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
              className="w-full bg-[#2D5A27] hover:bg-[#1D3124] text-white font-medium py-3 px-4 rounded-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('send_otp')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-[#1D3124]">{t('verify_mobile')}</h3>
              
              {/* PROTOTYPE OTP DISPLAY */}
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-[16px]">
                <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">{t('demo_mode_notice')}</p>
                <p className="text-sm text-orange-700">{t('prototype_otp_notice')}</p>
                <p className="text-2xl font-mono font-bold text-orange-600 mt-2 tracking-[0.2em]">{prototypeOtp}</p>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="--- ---"
                className="w-full px-4 py-4 bg-white border border-[#E0E7E1] rounded-xl focus:ring-2 focus:ring-[#A5D6A7] focus:border-transparent outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono text-[#1D3124]"
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
              className="w-full bg-[#2D5A27] hover:bg-[#1D3124] text-white font-medium py-3 px-4 rounded-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('verify_login')}
            </button>

            <div className="text-center">
              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={() => handleRequestOTP()}
                className="text-sm font-medium text-[#5A7A54] hover:text-[#2D5A27] disabled:opacity-50 transition-colors"
              >
                {countdown > 0 ? t('resend_otp_in', { seconds: countdown }) : t('resend_otp')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
