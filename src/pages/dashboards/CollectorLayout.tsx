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
  Bell,
  Search,
  ChevronDown
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
    { to: '/collector/contribution', icon: ShieldCheck, label: 'Contribution' },
    { to: '/collector/assistant', icon: Bot, label: t('Assistant') },
    { to: '/collector/profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <div className="collector-app-shell">
      <div className="collector-leaf collector-leaf-top-left" />
      <div className="collector-leaf collector-leaf-top-right" />
      <div className="collector-leaf collector-leaf-left-mid" />
      <div className="collector-leaf collector-leaf-right-mid" />
      <div className="collector-leaf collector-leaf-bottom-left" />
      <div className="collector-leaf collector-leaf-bottom-right" />
      <div className="collector-circuit collector-circuit-left" />
      <div className="collector-circuit collector-circuit-right" />
      <div className="collector-landscape" />
      <div className="collector-city" />
      <div className="collector-windmills" />

      <div className="collector-surface">
        <header className="collector-header">
          <div className="collector-brand-wrap">
            <div className="collector-brand-mark">R</div>
            <img src="/RecySetu%20Logo.png" alt="RecySetu logo" className="collector-logo" />
          </div>

          <div className="collector-search-wrap">
            <Search className="collector-search-icon" />
            <input type="text" value="" readOnly aria-label="Search materials" placeholder="Search materials, pickups, lots, or help..." className="collector-search-input" />
          </div>

          <div className="collector-header-actions">
            <LanguageSwitcher />
            <div ref={notificationRef} className="relative z-50">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                className="collector-icon-button collector-notification-button"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="collector-badge">{unreadCount}</span>
                )}
              </button>

              {notificationsOpen && (
                <div className="collector-notification-panel">
                  <div className="collector-notification-head">
                    <p>Notifications</p>
                    <span>{unreadCount} new</span>
                  </div>
                  <div className="collector-notification-list">
                    {demoNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className={`collector-notification-item ${item.unread ? 'is-unread' : ''}`}
                      >
                        <div className="collector-notification-meta">
                          <div>
                            <p>{item.title}</p>
                            <span>{item.message}</span>
                          </div>
                          {item.unread && <span className="collector-dot" />}
                        </div>
                        <small>{item.time}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <IvrAccess />

            <button
              type="button"
              onClick={() => navigate('/collector/profile')}
              aria-label="Open profile"
              className="collector-profile-chip"
            >
              <span className="collector-profile-avatar">R</span>
              <span className="collector-profile-text">
                <strong>{user?.name?.split(' ')[0] || 'Ramesh'}</strong>
                <small>{t('Collector')}</small>
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            <button
              className="collector-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <div className="collector-body-shell">
          <aside className="collector-sidebar">
            <nav className="collector-nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `collector-nav-item ${isActive ? 'is-active' : ''}`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="collector-sidebar-footer">
              <button onClick={handleLogout} className="collector-logout-button">
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {isMobileMenuOpen && (
            <div className="collector-mobile-menu">
              <nav className="collector-mobile-nav">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `collector-mobile-nav-item ${isActive ? 'is-active' : ''}`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="collector-mobile-logout"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          )}

          <main className="collector-main-area">
            <div className="collector-main-content">
              <Outlet />
            </div>
          </main>
        </div>

        <nav className="collector-bottom-nav">
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
                className={`collector-bottom-nav-item ${isActive ? 'is-active' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

