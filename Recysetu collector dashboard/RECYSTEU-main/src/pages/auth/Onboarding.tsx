import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { forwardGeocode, reverseGeocode } from '../../services/location';

export function Onboarding() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'collector';
  const mobile = searchParams.get('mobile') || '';
  
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(i18n.language || 'en');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<any>(null);
  
  useEffect(() => {
    i18n.changeLanguage(preferredLanguage);
  }, [preferredLanguage, i18n]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError(t('geo_unsupported'));
      return;
    }
    
    setLocationLoading(true);
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        
        try {
          const location = await reverseGeocode(latitude, longitude);
          setResolvedLocation(location);
          setAddress(location.formattedAddress);
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        setError(t('geo_denied'));
      }
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t('enter_name_error'));
    if (!address.trim()) return setError(t('enter_address_error'));
    
    setLoading(true);
    setError('');
    
    try {
      const location = resolvedLocation || await forwardGeocode(address);
      if (!location.state) throw new Error('Please enter a city and state so we can resolve your location.');
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: location.formattedAddress || address, latitude: location.latitude ?? latitude, longitude: location.longitude ?? longitude, location, preferredLanguage })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete profile');
      
      setUser(data.user);
      navigate(`/${data.user.role}`);
    } catch (err: any) {
      setError(err.message || 'Network error');
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
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-[#1D3124]">{t('complete_profile_title')}</h2>
      </div>
      
      <div className="p-6 sm:p-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm p-3 rounded-[16px] border border-red-100">
            {error}
          </div>
        )}
        
        <div className="mb-6 pb-4 border-b border-[#E0E7E1]">
          <span className="block text-sm text-[#5A7A54]">{t('mobile_number')}</span>
          <div className="flex items-center text-[#1D3124] font-medium">
            +91 {mobile} <span className="ml-2 text-green-600 text-xs font-bold uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full border border-green-200">{t('mobile_verified')}</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1D3124] mb-2">{t('full_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('name_placeholder')}
              className="w-full px-4 py-3 bg-white border border-[#E0E7E1] rounded-xl focus:ring-2 focus:ring-[#A5D6A7] focus:border-transparent outline-none transition-all text-[#1D3124]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#1D3124] mb-2">{t('address')}</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('address_placeholder')}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-[#E0E7E1] rounded-xl focus:ring-2 focus:ring-[#A5D6A7] focus:border-transparent outline-none transition-all text-[#1D3124] resize-none"
            />
            
            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-[#E0E7E1]"></div>
              <span className="px-3 text-xs text-[#5A7A54] uppercase font-bold tracking-wider">{t('or')}</span>
              <div className="flex-1 border-t border-[#E0E7E1]"></div>
            </div>
            
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center bg-[#F9FBFA] hover:bg-[#E8F3EA] border border-[#E0E7E1] text-[#2D5A27] font-medium py-3 px-4 rounded-xl transition-all"
            >
              {locationLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <MapPin className="w-5 h-5 mr-2" />
              )}
              📍 {t('detect_location')}
            </button>
            
            {latitude && longitude && (
              <p className="mt-2 text-xs text-[#2D5A27] font-medium flex items-center">
                {t('location_detected')}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#1D3124] mb-2">{t('preferred_language')}</label>
            <div className="flex space-x-3">
              <label className={`flex-1 p-3 rounded-xl border text-center cursor-pointer transition-colors ${preferredLanguage === 'en' ? 'border-[#2D5A27] bg-[#E8F3EA] text-[#2D5A27] font-semibold' : 'border-[#E0E7E1] text-[#5A7A54] hover:bg-gray-50'}`}>
                <input type="radio" name="lang" value="en" className="hidden" checked={preferredLanguage === 'en'} onChange={() => setPreferredLanguage('en')} />
                English
              </label>
              <label className={`flex-1 p-3 rounded-xl border text-center cursor-pointer transition-colors ${preferredLanguage === 'hi' ? 'border-[#2D5A27] bg-[#E8F3EA] text-[#2D5A27] font-semibold' : 'border-[#E0E7E1] text-[#5A7A54] hover:bg-gray-50'}`}>
                <input type="radio" name="lang" value="hi" className="hidden" checked={preferredLanguage === 'hi'} onChange={() => setPreferredLanguage('hi')} />
                हिंदी
              </label>
              <label className={`flex-1 p-3 rounded-xl border text-center cursor-pointer transition-colors ${preferredLanguage === 'mr' ? 'border-[#2D5A27] bg-[#E8F3EA] text-[#2D5A27] font-semibold' : 'border-[#E0E7E1] text-[#5A7A54] hover:bg-gray-50'}`}>
                <input type="radio" name="lang" value="mr" className="hidden" checked={preferredLanguage === 'mr'} onChange={() => setPreferredLanguage('mr')} />
                मराठी
              </label>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D5A27] hover:bg-[#1D3124] text-white font-bold py-4 px-4 rounded-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('create_account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
