import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';

export function DashboardPlaceholder({ title, role }: { title: string, role: string }) {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await refreshSession();
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#2C3E33]">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img
          src="/RecySetu%20Logo.png"
          alt="RecySetu logo"
          className="h-9 w-auto object-contain"
        />
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">{user?.name} ({role})</span>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      <main className="p-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
          <h2 className="text-3xl font-semibold mb-4 text-[#2F5C3E]">{title}</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            This dashboard is under construction. Currently validating the Authentication and Application Architecture.
          </p>
        </div>
      </main>
    </div>
  );
}
