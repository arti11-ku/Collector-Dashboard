import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { useTranslation } from 'react-i18next';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { i18n } = useTranslation();

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser && newUser.preferredLanguage) {
      i18n.changeLanguage(newUser.preferredLanguage);
      localStorage.setItem('i18nextLng', newUser.preferredLanguage);
    }
  };

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await res.json();
      const fetchedUser = data.user || null;
      setUser(fetchedUser);
      if (fetchedUser && fetchedUser.preferredLanguage) {
        i18n.changeLanguage(fetchedUser.preferredLanguage);
        localStorage.setItem('i18nextLng', fetchedUser.preferredLanguage);
      }
    } catch (error) {
      console.error('Session check failed', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, setUser: handleSetUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
