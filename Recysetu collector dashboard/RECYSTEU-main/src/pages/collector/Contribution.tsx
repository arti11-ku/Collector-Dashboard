import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, TrendingUp, Award, ShieldCheck, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';

interface PointsTransaction {
  id: string;
  points: number;
  reason: string;
  createdAt: string;
  referenceId: string;
}

const DEMO_CONTRIBUTION_TRANSACTIONS: PointsTransaction[] = [
  {
    id: 'demo-contribution-1',
    points: 70,
    reason: 'Used mobile phone collection drive',
    createdAt: '2026-09-05T11:15:00Z',
    referenceId: 'LOT-2048',
  },
  {
    id: 'demo-contribution-2',
    points: 110,
    reason: 'Laptop handover through local aggregator',
    createdAt: '2026-09-08T14:10:00Z',
    referenceId: 'LOT-2052',
  },
];

export function Contribution() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/collector/points-history');
        if (res.ok) {
          const data = await res.json();
          const availableTransactions = Array.isArray(data.transactions) && data.transactions.length > 0 ? data.transactions : DEMO_CONTRIBUTION_TRANSACTIONS;
          setTransactions(availableTransactions);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error(e);
      }

      setTransactions(DEMO_CONTRIBUTION_TRANSACTIONS);
      setLoading(false);
    };
    fetchTransactions();
  }, []);

  const displayScore = user?.contributionScore ?? t('Building');
  const scoreNum = typeof displayScore === 'number' ? displayScore : 0;
  
  const getLevel = (score: number) => {
    if (score === 0) return t('Getting Started');
    if (score <= 40) return t('Active Contributor');
    if (score <= 60) return t('Trusted Contributor');
    if (score <= 80) return t('Reliable Contributor');
    return t('RECYSETU Champion');
  };

  const benefits = [
    { name: t('Priority Pickup Eligibility'), requiredPoints: 50, requiredScore: 50 },
    { name: t('Recognition Badge'), requiredPoints: 100, requiredScore: 60 },
    { name: t('Partner Program Eligibility'), requiredPoints: 200, requiredScore: 70 },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center mb-2">
        <button 
          onClick={() => navigate('/collector/dashboard')}
          className="w-10 h-10 rounded-full bg-white border border-[#E0E7E1] flex items-center justify-center text-[#5A7A54] hover:text-[#2D5A27] transition-colors shadow-sm mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-[#1D3124]">{t('Contribution')}</h2>
      </div>

      {/* Unified Contribution Card */}
      <div className="bg-gradient-to-br from-[#2D5A27] to-[#1D3124] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div className="mb-6 md:mb-0 w-full md:w-auto">
            <p className="text-sm font-bold text-[#A5D6A7] uppercase tracking-wider mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" /> {t('RECYSETU Contribution')}
            </p>
            <div className="flex items-baseline mb-2">
              <h3 className="text-6xl font-bold">{displayScore}</h3>
              {typeof displayScore === 'number' && <span className="text-2xl text-[#A5D6A7] ml-2">/ 100</span>}
            </div>
            <div className="bg-white/10 rounded-2xl p-3 inline-block backdrop-blur-sm border border-white/10 mb-4">
              <h4 className="text-xl font-bold text-white">{getLevel(scoreNum)}</h4>
            </div>
            
            <p className="text-[#A5D6A7] text-lg flex items-center font-medium">
              <Award className="w-5 h-5 mr-2" /> {user?.points?.toLocaleString() ?? '0'} {t('RECYSETU Points')}
            </p>
          </div>
          
          <div className="w-full md:w-1/2 bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <h4 className="font-bold text-white text-sm uppercase tracking-widest mb-3">{t('Benefits Progress')}</h4>
            <div className="space-y-3">
              {benefits.map(b => {
                const unlocked = (user?.points || 0) >= b.requiredPoints && scoreNum >= b.requiredScore;
                return (
                  <div key={b.name} className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${unlocked ? 'text-white' : 'text-green-100/60'}`}>
                      {b.name}
                    </span>
                    {unlocked ? (
                      <span className="bg-[#A5D6A7] text-[#1D3124] text-[10px] font-bold px-2 py-1 rounded-full uppercase">{t('Unlocked')}</span>
                    ) : (
                      <span className="bg-white/10 text-white/50 text-[10px] font-bold px-2 py-1 rounded-full uppercase border border-white/10">
                        {t('Needs {{points}} pts', { points: b.requiredPoints })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contribution History Ledger */}
      <div className="bg-white border border-[#E0E7E1] rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E0E7E1]">
          <h3 className="text-lg font-bold text-[#1D3124] flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#5A7A54]" /> {t('Completed Activities')}
          </h3>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div></div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-[#5A7A54]">
            {t('No contribution history yet')}
          </div>
        ) : (
          <div className="divide-y divide-[#E0E7E1]">
            {transactions.map(t => (
              <div key={t.id} className="p-6 flex justify-between items-center hover:bg-[#F9FBFA] transition-colors">
                <div>
                  <h4 className="font-bold text-[#1D3124]">{t.reason}</h4>
                  <div className="flex items-center mt-1 text-sm text-[#5A7A54]">
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>{t('Ref:')} {t.referenceId}</span>
                  </div>
                </div>
                <div className="bg-[#E8F3EA] text-[#2D5A27] font-bold px-4 py-2 rounded-xl text-lg flex items-center">
                  +{t.points}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
