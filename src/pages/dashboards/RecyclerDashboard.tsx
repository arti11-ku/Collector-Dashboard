import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function RecyclerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/recycler/stats', { credentials: 'include' });
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-[#5A7A54]">Loading...</div>;

  return (
    <div className="space-y-6 pb-6 p-4 md:p-8 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-[#1D3124] mb-2">Recycler Dashboard</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">Lots Awaiting Verificaton</p>
          <div className="text-3xl font-bold text-orange-700">{stats?.awaitingVerification || 0}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">Processing Records</p>
          <div className="text-3xl font-bold text-blue-700">{stats?.processing || 0}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">Completed Lots</p>
          <div className="text-3xl font-bold text-[#2D5A27]">{stats?.completedLots || 0}</div>
        </div>
      </div>
    </div>
  );
}
