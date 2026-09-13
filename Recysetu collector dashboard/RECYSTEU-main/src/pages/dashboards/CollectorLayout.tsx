import React, { useRef, useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  PackageSearch, 
  Truck, 
  Wallet, 
  ShieldCheck, 
  User as UserIcon, 
  Bot,
  Menu,
  X,
  LogOut,
  Bell
} from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { IvrAccess } from '../../components/IvrAccess';

export function CollectorLayout() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [notificationsOpen]);

  const demoNotifications = [
    { id: 1, title: 'Pickup accepted', message: 'GreenLoop Aggregator accepted your lot request.', time: '2 min ago', unread: true },
    { id: 2, title: 'New quotation', message: 'A recycler sent a better offer for your scrap.', time: '1 hour ago', unread: true },
    { id: 3, title: 'Earnings updated', message: 'Your December payout summary is ready to review.', time: 'Today', unread: false }
  ];
  const unreadCount = demoNotifications.filter(item => item.unread).length;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      navigate('/auth');
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { to: '/collector/dashboard', icon: Home, label: 'Home' },
    { to: '/collector/material', icon: PackageSearch, label: 'Material' },
    { to: '/collector/pickup', icon: Truck, label: 'Pickup' },
    { to: '/collector/lots', icon: ShieldCheck, label: 'My Lots' },
    { to: '/collector/earnings', icon: Wallet, label: 'Earnings' },
    { to: '/collector/contribution', icon: ShieldCheck, label: 'Contribution' }, // Re-using icon for now
    { to: '/collector/assistant', icon: Bot, label: t('Assistant') },
    { to: '/collector/profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-[#F9FBFA] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E0E7E1] px-4 py-3 flex items-center justify-between sticky top-0 z-40 overflow-visible">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D5A27] flex items-center justify-center shadow-md">
             <span className="text-white font-bold text-xl tracking-tight">R</span>
          </div>
          <div>
            <img
              src="/RecySetu%20Logo.png"
              alt="RecySetu logo"
              className="h-20 sm:h-28 w-auto object-contain"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <LanguageSwitcher />

          <div ref={notificationRef} className="relative z-50">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full bg-[#E8F3EA] text-[#2D5A27] flex items-center justify-center hover:bg-[#D1E8D5] transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#D94D4D] text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-2xl border border-[#E0E7E1] bg-white shadow-[0_10px_30px_rgba(19,42,20,0.12)] overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E0E7E1] bg-[#F9FBFA]">
                  <p className="font-semibold text-[#1D3124]">Notifications</p>
                  <span className="text-xs text-[#5A7A54]">{unreadCount} new</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {demoNotifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className={`w-full text-left px-4 py-3 border-b border-[#F1F4F1] hover:bg-[#F9FBFA] transition-colors ${item.unread ? 'bg-[#F7FBF8]' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1D3124]">{item.title}</p>
                          <p className="mt-1 text-xs text-[#5A7A54]">{item.message}</p>
                        </div>
                        {item.unread && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#2D5A27]" />}
                      </div>
                      <p className="mt-2 text-[11px] text-[#7A8C7D]">{item.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <IvrAccess />
          <button type="button" onClick={() => navigate('/collector/profile')} aria-label="Open profile" className="w-9 h-9 rounded-full bg-[#E8F3EA] text-[#2D5A27] flex items-center justify-center hover:bg-[#D1E8D5]"><UserIcon className="w-5 h-5" /></button>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-[#5A7A54] hover:text-[#2D5A27] hover:bg-[#E0E7E1] rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Main Content Area with Sidebar/Bottom Nav */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#E0E7E1] h-full overflow-y-auto shrink-0">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-[#E8F3EA] text-[#2D5A27] font-semibold' 
                      : 'text-[#5A7A54] hover:bg-[#F9FBFA] hover:text-[#2D5A27] font-medium'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-[#E0E7E1]">
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-left"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute inset-0 z-30 bg-white flex flex-col lg:hidden overflow-y-auto">
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center space-x-4 px-4 py-4 rounded-xl transition-all text-lg ${
                      isActive 
                        ? 'bg-[#E8F3EA] text-[#2D5A27] font-semibold' 
                        : 'text-[#5A7A54] hover:bg-[#F9FBFA] hover:text-[#2D5A27] font-medium'
                    }`
                  }
                >
                  <item.icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              
              <button 
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center space-x-4 px-4 py-4 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-left text-lg mt-4"
              >
                <LogOut className="w-6 h-6" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        )}

        {/* Main Route Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[#F9FBFA]">
          <div className="max-w-4xl mx-auto">
             <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - only shows on mobile, sticky to bottom */}
      <nav className="lg:hidden bg-white border-t border-[#E0E7E1] flex justify-around items-center px-2 py-2 pb-safe sticky bottom-0 z-40 shadow-[0_-4px_10px_rgba(45,90,39,0.05)]">
        {[
          { to: '/collector/dashboard', icon: Home, label: 'Home' },
          { to: '/collector/pickup', icon: Truck, label: 'Pickup' },
          { to: '/collector/material', icon: PackageSearch, label: 'Add' },
          { to: '/collector/lots', icon: ShieldCheck, label: t('Lots') },
        ].map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                isActive 
                  ? 'text-[#2D5A27] font-semibold' 
                  : 'text-[#5A7A54] hover:text-[#2D5A27] font-medium'
              }`}
            >
              <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-[#E8F3EA]' : ''}`} />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
