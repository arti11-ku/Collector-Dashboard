import React, { } from 'react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router';
import { 
  PackagePlus, 
  Truck, 
  Tag,
  ShieldCheck, 
  Wallet, 
  Bot, 
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

interface CollectorStats {
  activePickups: number;
  activeLots: number;
  pendingHandovers: number;
  earnings: number;
  contributionScore: number | string;
  points: number;
}

export function CollectorDashboard(props) {
  const { t } = useTranslation();
  const { user, refreshSession } = useAuth();
  const [stats, setStats] = useState<CollectorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [activeLots, setActiveLots] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/collector/stats');
        const data = await res.json();
        if (data && !data.error) {
          setStats(data);
        }
        const currentResponse = await fetch('/api/collector/current-transaction', { credentials: 'include' });
        const currentData = await currentResponse.json();
        setTransaction(currentData.transaction || null);
        const lotsResponse = await fetch('/api/collector/lots', { credentials: 'include' });
        const lotsData = await lotsResponse.json();
        setActiveLots((lotsData.lots || []).filter((lot: any) => !['COMPLETED', 'CANCELLED', 'RECYCLING_COMPLETED'].includes(lot.status)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? t('GOOD MORNING') : currentHour < 17 ? t('GOOD AFTERNOON') : t('GOOD EVENING');

  const displayScore = stats?.contributionScore ?? 'Building';

  return (
    <div className="space-y-6 pb-6">
      
      {/* Greeting Header */}
      <div className="bg-white rounded-3xl p-6 border border-[#E0E7E1] shadow-[0_4px_20px_rgba(45,90,39,0.03)] relative overflow-hidden">
        {/* Organic blob decoration */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#A5D6A7] rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#5A7A54] rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        
        <div className="relative z-10">
          <p className="text-xs font-bold text-[#5A7A54] tracking-widest uppercase mb-1">{greeting}</p>
          <h2 className="text-3xl font-bold text-[#1D3124] mb-2 tracking-tight">{t('Namaste') + ', ' + (user?.name?.split(' ')[0] || 'Collector')}</h2>
          <p className="text-[#5A7A54] text-sm max-w-md">{t('mission_statement')}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Active Pickups'), value: stats?.activePickups ?? '-', color: 'bg-blue-50 text-blue-700' },
          { label: t('Active Lots'), value: stats?.activeLots ?? '-', color: 'bg-purple-50 text-purple-700' },
          { label: t('Pending Handovers'), value: stats?.pendingHandovers ?? '-', color: 'bg-orange-50 text-orange-700' },
          { label: t('Total Earnings'), value: stats?.earnings ? `₹${stats.earnings}` : '₹0', color: 'bg-[#E8F3EA] text-[#2D5A27]' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#E0E7E1] shadow-sm flex flex-col justify-center">
            <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-1">{stat.label}</p>
            <div className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {activeLots.length > 0 && <div className="bg-white rounded-3xl p-6 border border-[#E0E7E1] shadow-sm"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-[#1D3124]">YOUR ACTIVE LOTS ({activeLots.length}/5)</h3><Link to="/collector/lots" className="text-sm font-bold text-[#2D5A27]">View All Lots</Link></div><div className="grid md:grid-cols-2 gap-3">{activeLots.map(lot => <Link key={lot.id} to={`/collector/lots/${lot.lotId}`} className="border border-[#E0E7E1] rounded-xl p-4"><div className="flex justify-between"><b>{lot.lotId}</b><span className="text-xs font-bold text-orange-700">{lot.status.replace(/_/g, ' ')}</span></div><p className="text-sm mt-2">{(lot.items || []).map((item: any) => `${item.materialName || item.materialId} - ${item.declaredWeight} kg`).join(', ')}</p><p className="text-xs text-[#5A7A54] mt-1">{lot.pickup ? `Pickup ${lot.pickup.preferredDate}` : 'Pickup not booked yet'}</p></Link>)}</div></div>}

      {/* Unified Contribution Section */}
      <div className="bg-gradient-to-br from-[#2D5A27] to-[#1D3124] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white opacity-5 rounded-full -translate-y-1/4 translate-x-1/4 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div className="mb-6 md:mb-0">
            <p className="text-xs font-bold text-[#A5D6A7] uppercase tracking-wider mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" /> {t('RECYSETU Contribution')}
            </p>
            <div className="flex items-baseline mb-2">
              <h3 className="text-5xl font-bold">{displayScore}</h3>
              {typeof displayScore === "number" && <span className="text-2xl text-[#A5D6A7] ml-1">/ 100</span>}
            </div>
            <p className="text-lg text-white font-medium mb-1">
              {typeof displayScore === "number" && displayScore > 60 ? "Reliable Contributor" : "Active Contributor"}
            </p>
            <p className="text-[#A5D6A7] text-sm flex items-center">
              <Award className="w-4 h-4 mr-1" /> {stats?.points?.toLocaleString() ?? "0"} RECYSETU Points
            </p>
            <p className="text-sm text-green-100 mt-4 max-w-xs">Your contribution is growing.</p>
          </div>
          <div className="flex flex-col items-end">
            <Link to="/collector/contribution" className="inline-flex justify-center items-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all">
              {t('View Contribution Details')} <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <h3 className="text-sm font-bold text-[#1D3124] uppercase tracking-widest pt-2">{t('Quick Actions')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { to: '/collector/material', icon: PackagePlus, label: t('Add Material'), color: 'bg-emerald-50 text-emerald-700' },
          { to: '/collector/check-price', icon: Tag, label: t('Check Price'), color: 'bg-blue-50 text-blue-700' },
          { to: '/collector/lots', icon: ShieldCheck, label: t('My Lots'), color: 'bg-indigo-50 text-indigo-700' },
          { to: '/collector/pickup', icon: Truck, label: t('Track Pickup'), color: 'bg-cyan-50 text-cyan-700' },
          { to: '/collector/earnings', icon: Wallet, label: t('My Earnings'), color: 'bg-emerald-50 text-emerald-700' },
          { to: '/collector/assistant', icon: Bot, label: t('Assistant'), color: 'bg-purple-50 text-purple-700' },
        ].map((action, i) => (
          <Link
            key={i}
            to={action.to}
            className="flex flex-col items-center justify-center p-6 bg-white border border-[#E0E7E1] rounded-2xl hover:shadow-md transition-all active:scale-95 group"
          >
            <div className={`w-14 h-14 rounded-full ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
              <action.icon className="w-7 h-7" />
            </div>
            <span className="font-semibold text-[#1D3124] text-sm text-center">{action.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}
