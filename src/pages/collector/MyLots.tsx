import React, { } from 'react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Filter, QrCode, ShieldCheck, CheckCircle, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { getTotalWeight } from '../../services/pickupRules';

interface Lot {
  id: string;
  lotId: string;
  materialId: string;
  declaredWeight: number;
  unit: string;
  status: string;
  createdAt: string;
  qrToken?: string;
  items?: { materialId: string; materialName?: string; declaredWeight: number; unit: string }[];
  pickup?: any;
  totalWeight?: number;
  agreedAmount?: number;
  referencePrice?: { total?: number };
  pickupRequestId?: string;
  partnerName?: string;
}

const normalizeStatus = (status: string) => ({ HANDED_OVER: 'HANDOVER_CONFIRMED', PROCESSING: 'PAYMENT_PROCESSING', RECYCLING_COMPLETED: 'COMPLETED' } as Record<string, string>)[status] || status;

export function MyLots(props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const fetchLots = async () => {
      try {
        const res = await fetch('/api/collector/lots');
        const data = await res.json();
        if (data.lots) {
          setLots(data.lots);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLots();
  }, []);

  const cancelLot = async (lot: Lot) => {
    if (normalizeStatus(lot.status) === 'COMPLETED') return;
    if (!window.confirm(`Cancel ${lot.lotId}? This keeps the historical record but removes it from active Lots.`)) return;
    setActionError('');
    const response = await fetch(`/api/collector/lots/${lot.lotId}/cancel`, { method: 'POST', credentials: 'include' });
    const data = await response.json();
    if (!response.ok) { setActionError(data.error || 'Lot could not be cancelled.'); return; }
    setLots(current => current.map(item => item.id === lot.id ? { ...item, status: 'CANCELLED' } : item));
  };

  const getStatusColor = (status: string) => {
    switch(normalizeStatus(status)) {
      case 'PENDING_HANDOVER': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'HANDOVER_CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PAYMENT_PROCESSING': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPLETED': return 'bg-[#E8F3EA] text-[#2D5A27] border-[#A5D6A7]';
      case 'SUCCESSFUL_COMPLETED': return 'bg-[#E8F3EA] text-[#0F6B45] border-[#78C7A6]';
      case 'DISPUTED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(normalizeStatus(status)) {
      case 'COMPLETED':
      case 'SUCCESSFUL_COMPLETED': return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'PENDING_HANDOVER': return <Clock className="w-4 h-4 mr-1" />;
      default: return <ShieldCheck className="w-4 h-4 mr-1" />;
    }
  };

  const filteredLots = lots
    .filter(l => filter === 'ALL' || normalizeStatus(l.status) === filter)
    .filter(l => l.lotId.toLowerCase().includes(search.toLowerCase()) || (l.items || [{ materialId: l.materialId }]).some(item => item.materialId.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="bg-white border border-[#E0E7E1] rounded-3xl overflow-hidden shadow-sm min-h-[80vh]">
      <div className="px-6 py-4 border-b border-[#E0E7E1] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/collector/dashboard')}
            className="text-[#5A7A54] hover:text-[#2D5A27] transition-colors mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-[#1D3124] text-xl">My Lots</h2>
        </div>

        <div className="flex space-x-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A7A54]" />
            <input 
              type="text" 
              placeholder="Search Lot ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E0E7E1] rounded-xl text-sm focus:ring-2 focus:ring-[#A5D6A7] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Filters (Scrollable) */}
      <div className="border-b border-[#E0E7E1] bg-[#F9FBFA] px-4 py-3 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-2">
        {['ALL', 'PENDING_HANDOVER', 'HANDOVER_CONFIRMED', 'PAYMENT_PROCESSING', 'SUCCESSFUL_COMPLETED', 'COMPLETED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-[#2D5A27] text-white' 
                : 'bg-white border border-[#E0E7E1] text-[#5A7A54] hover:bg-[#E8F3EA] hover:text-[#2D5A27]'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6">
        {actionError && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="text-center py-16 bg-[#F9FBFA] rounded-2xl border border-dashed border-[#A5D6A7]">
            <Package className="w-12 h-12 text-[#A5D6A7] mx-auto mb-3" />
            <h3 className="text-lg font-medium text-[#1D3124]">No lots found</h3>
            <p className="text-[#5A7A54] text-sm mt-1">You haven't created any lots matching this filter.</p>
            <button 
              onClick={() => navigate('/collector/material')}
              className="mt-4 bg-[#2D5A27] text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-[#1D3124] transition-colors"
            >
              Add Material
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredLots.map(lot => (
              <div 
                key={lot.id} 
                onClick={() => navigate(`/collector/lots/${lot.lotId}`)}
                className="border border-[#E0E7E1] rounded-2xl p-5 hover:border-[#A5D6A7] hover:shadow-md transition-all cursor-pointer bg-white group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-bold text-[#5A7A54] uppercase">{new Date(lot.createdAt).toLocaleDateString()}</p>
                    <h4 className="font-bold text-[#1D3124] text-lg mt-1">{lot.lotId}</h4>
                  </div>
                  <div className="flex gap-2"><button aria-label="Cancel Lot" onClick={(e) => { e.stopPropagation(); cancelLot(lot); }} disabled={['COMPLETED', 'SUCCESSFUL_COMPLETED'].includes(normalizeStatus(lot.status))} className="w-10 h-10 rounded-xl border border-red-200 text-red-600 disabled:opacity-30">×</button><button onClick={(e) => { e.stopPropagation(); navigate(`/collector/lots/${lot.lotId}?showQr=true`); }} className="w-10 h-10 rounded-xl bg-[#F9FBFA] border border-[#E0E7E1] flex items-center justify-center text-[#2D5A27]"><QrCode className="w-5 h-5" /></button></div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div>{(lot.items || [{ materialId: lot.materialId, declaredWeight: lot.declaredWeight, unit: lot.unit }]).map(item => <p key={item.materialId} className="text-sm text-[#1D3124] font-medium">{item.materialName || item.materialId} - {item.declaredWeight} {item.unit}</p>)}</div>
                  <p className="text-sm font-bold text-[#1D3124]">Total Weight: {lot.totalWeight || getTotalWeight(lot.items || [{ declaredWeight: lot.declaredWeight }])} kg</p>
                  <p className="text-sm text-[#5A7A54]">{normalizeStatus(lot.status) === 'SUCCESSFUL_COMPLETED' ? 'Final amount received' : 'Estimated value'}: {(lot.referencePrice?.total || lot.agreedAmount) ? `₹${(lot.referencePrice?.total || lot.agreedAmount || 0).toLocaleString()}` : 'Reference value unavailable'}</p>
                  <p className="text-sm text-[#5A7A54]">Partner: {lot.partnerName || 'Not selected'}</p>
                  {lot.pickup ? <p className="text-sm text-[#2D5A27] font-semibold">Pickup: {lot.pickup.preferredDate} at {lot.pickup.preferredTime}</p> : normalizeStatus(lot.status) !== 'COMPLETED' && normalizeStatus(lot.status) !== 'CANCELLED' ? <button onClick={(e) => { e.stopPropagation(); navigate(`/collector/pickup?lotId=${lot.lotId}`); }} className="mt-2 text-sm font-bold text-[#2D5A27]">Proceed to Book Pickup</button> : null}
                </div>
                <div className="flex justify-end items-end mt-3">
                  <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center border ${getStatusColor(lot.status)}`}>
                    {getStatusIcon(lot.status)}
                    {normalizeStatus(lot.status).replace(/_/g, ' ')}
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
