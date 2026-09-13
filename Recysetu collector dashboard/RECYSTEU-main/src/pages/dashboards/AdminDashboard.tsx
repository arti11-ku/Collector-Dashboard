import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Package, Truck, Activity, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
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
      <h2 className="text-3xl font-bold text-[#1D3124] mb-2">System Admin Overview</h2>
      <p className="text-[#5A7A54]">Monitor RECYSETU ecosystem activity and pending items.</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">Total Users</p>
          <div className="text-3xl font-bold text-blue-700">{stats?.totalUsers || 0}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">Total Lots</p>
          <div className="text-3xl font-bold text-purple-700">{stats?.totalLots || 0}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">Pickups</p>
          <div className="text-3xl font-bold text-orange-700">{stats?.totalPickups || 0}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">Recycled</p>
          <div className="text-3xl font-bold text-[#2D5A27]">{stats?.completedLots || 0}</div>
        </div>
      </div>

      <div className="mt-8 bg-white border border-red-100 rounded-3xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" /> Needs Attention
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-red-50 pb-2">
            <span className="text-gray-700">Weight Discrepancies</span>
            <span className="font-bold text-red-600">{stats?.attention?.weightDiscrepancies || 0}</span>
          </div>
          <div className="flex justify-between items-center border-b border-red-50 pb-2">
            <span className="text-gray-700">Recycler Verifications</span>
            <span className="font-bold text-orange-600">{stats?.attention?.recyclerVerifications || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Pending Complaints</span>
            <span className="font-bold text-red-600">{stats?.attention?.complaints || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
