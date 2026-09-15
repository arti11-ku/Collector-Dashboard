import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function PasswordLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'recycler';
  const { setUser } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, role })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || t('invalid_credentials'));
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
          onClick={() => navigate(-1)}
          className="text-[#5A7A54] hover:text-[#2D5A27] transition-colors mr-3"
          aria-label={t('back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-[#1D3124]">
          {role === 'admin' ? t('admin_login') : t('recycler_login')}
        </h2>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm p-3 rounded-[16px] border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-[#1D3124] mb-2">
              {t('user_id')}
            </label>
            <input
              id="userId"
              type="text"
              className="w-full px-4 py-3 bg-white border border-[#E0E7E1] rounded-xl focus:ring-2 focus:ring-[#A5D6A7] focus:border-transparent outline-none transition-all text-[#1D3124]"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
              placeholder={role === 'admin' ? 'demo-admin' : 'demo-recycler'}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#1D3124]">
                {t('password')}
              </label>
              <button type="button" className="text-xs font-medium text-[#5A7A54] hover:text-[#2D5A27]">
                {t('forgot_password')}
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-4 pr-12 py-3 bg-white border border-[#E0E7E1] rounded-xl focus:ring-2 focus:ring-[#A5D6A7] focus:border-transparent outline-none transition-all text-[#1D3124]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5A7A54] hover:text-[#2D5A27] focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hide_password') : t('show_password')}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !userId || !password}
              className="w-full bg-[#2D5A27] hover:bg-[#1D3124] text-white font-medium py-3 px-4 rounded-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login')}
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-[16px]">
             <p className="text-xs font-bold text-blue-800 uppercase mb-1">Demo Credentials</p>
             <p className="text-sm text-blue-700 font-mono">ID: {role === 'admin' ? 'demo-admin' : 'demo-recycler'}</p>
             <p className="text-sm text-blue-700 font-mono">PWD: {role === 'admin' ? 'admin123' : 'password123'}</p>
          </div>
        </form>
      </div>
    </div>
  );
}
