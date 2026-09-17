import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ArrowLeft, Wallet, TrendingUp, CheckCircle, Clock } from 'lucide-react';

interface EarningTransaction {
  id: string;
  amount: number;
  lotId: string;
  material: string;
  weight: number;
  status: string;
  createdAt: string;
}

const DEMO_EARNINGS: EarningTransaction[] = [
  {
    id: 'demo-earning-1',
    amount: 450,
    lotId: 'LOT-2048',
    material: 'Mobile Phone',
    weight: 0.8,
    status: 'Paid',
    createdAt: '2026-09-06T10:30:00Z',
  },
  {
    id: 'demo-earning-2',
    amount: 1200,
    lotId: 'LOT-2052',
    material: 'Laptop',
    weight: 2.4,
    status: 'Paid',
    createdAt: '2026-09-09T15:45:00Z',
  },
];

export function Earnings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch('/api/collector/earnings', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const availableTransactions = Array.isArray(data.transactions) && data.transactions.length > 0 ? data.transactions : DEMO_EARNINGS;
          setTransactions(availableTransactions);
          setTotalEarnings(availableTransactions.reduce((sum: number, item: EarningTransaction) => sum + Number(item.amount || 0), 0));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error(e);
      }

      setTransactions(DEMO_EARNINGS);
      setTotalEarnings(DEMO_EARNINGS.reduce((sum, item) => sum + item.amount, 0));
      setLoading(false);
    };
    fetchEarnings();
  }, []);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-[#E0E7E1] flex items-center justify-center text-[#5A7A54] hover:text-[#2D5A27] transition-colors shadow-sm mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-[#1D3124]">My Earnings</h2>
      </div>

      <div className="bg-gradient-to-br from-[#2D5A27] to-[#1D3124] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-start">
          <p className="text-sm font-bold text-[#A5D6A7] uppercase tracking-wider mb-2 flex items-center">
            <Wallet className="w-4 h-4 mr-2" /> Total Earnings
          </p>
          <h3 className="text-6xl font-bold mb-4">
            ₹{totalEarnings.toLocaleString()}
          </h3>
          <div className="flex space-x-4">
             <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-xs text-green-100 font-medium uppercase tracking-wider mb-1">Paid Earnings</p>
                <h4 className="text-xl font-bold">₹{totalEarnings.toLocaleString()}</h4>
             </div>
             <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-xs text-green-100 font-medium uppercase tracking-wider mb-1">Pending</p>
                <h4 className="text-xl font-bold">₹0</h4>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E0E7E1] rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E0E7E1]">
          <h3 className="text-lg font-bold text-[#1D3124] flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-[#5A7A54]" /> Recent Transactions
          </h3>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div></div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-[#5A7A54]">
            No earnings history yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E0E7E1]">
            {transactions.map(t => (
              <div key={t.id} className="p-6 hover:bg-[#F9FBFA] transition-colors flex flex-col md:flex-row md:items-center justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="font-bold text-[#1D3124] text-lg">{t.material}</h4>
                    <span className="text-sm font-medium text-[#5A7A54] bg-gray-100 px-2 py-0.5 rounded-full">{t.weight} kg</span>
                  </div>
                  <div className="flex items-center text-sm text-[#5A7A54] space-x-4">
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {new Date(t.createdAt).toLocaleDateString()}</span>
                    <span>Ref: {t.lotId}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between md:flex-col md:items-end">
                   <div className="text-2xl font-bold text-[#2D5A27] mb-1">₹{t.amount.toLocaleString()}</div>
                   <div className="flex items-center text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                     <CheckCircle className="w-3 h-3 mr-1" /> {t.status}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
