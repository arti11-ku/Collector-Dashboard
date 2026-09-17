import React, { } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Package, Download, Share2, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { QRCodeCanvas } from 'qrcode.react';

interface Lot {
  id: string;
  lotId: string;
  materialId: string;
  declaredWeight: number;
  actualWeight?: number;
  unit: string;
  status: string;
  createdAt: string;
  qrToken?: string;
  pickupRequestId?: string;
  assignedPartnerId?: string;
  assignedPartnerType?: string;
  partnerName?: string;
  partnerAddress?: string;
  handoverOtp?: string;
  agreedAmount?: number;
  totalWeight?: number;
  pickupFee?: number;
  pickupEligibility?: string;
  pickup?: any;
  items?: { materialId: string; materialName?: string; declaredWeight: number; unit: string }[];
}

interface TraceEvent {
  id: string;
  eventType: string;
  timestamp: string;
  actorRole: string;
}

export function LotDetails(props) {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const showQr = searchParams.get('showQr') === 'true';
  const navigate = useNavigate();
  
  const [lot, setLot] = useState<Lot | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLot = async () => {
      try {
        const res = await fetch(`/api/collector/lots/${id}`);
        const data = await res.json();
        if (data.lot) {
          setLot(data.lot);
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchLot();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="text-center py-12">
        <p className="text-[#5A7A54]">{t('Lot not found.')}</p>
        <button onClick={() => navigate('/collector/lots')} className="mt-4 text-[#2D5A27] font-medium">{t('Go back')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center">
        <button 
          onClick={() => navigate('/collector/lots')}
          className="w-10 h-10 rounded-full bg-white border border-[#E0E7E1] flex items-center justify-center text-[#5A7A54] hover:text-[#2D5A27] transition-colors shadow-sm mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-[#1D3124]">Lot {lot.lotId}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR & Core Details */}
        <div className="bg-white border border-[#E0E7E1] rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-48 h-48 bg-[#F9FBFA] border-2 border-dashed border-[#A5D6A7] rounded-2xl flex items-center justify-center p-2 mb-4">
               {lot.qrToken ? (
                 <QRCodeCanvas value={lot.qrToken} size={160} level="H" includeMargin={false} className="rounded-lg" />
               ) : (
                 <span className="text-[#5A7A54] text-sm">QR Unavailable</span>
               )}
            </div>
            
            <div className="flex space-x-3 w-full">
              <button className="flex-1 bg-[#E8F3EA] text-[#2D5A27] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-[#D1E8D5] transition-colors">
                <Download className="w-4 h-4 mr-2" /> Download
              </button>
              <button className="flex-1 bg-[#F9FBFA] border border-[#E0E7E1] text-[#5A7A54] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-[#E8F3EA] hover:text-[#2D5A27] transition-colors">
                <Share2 className="w-4 h-4 mr-2" /> Share
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]">
              <span className="text-[#5A7A54] text-sm">Status</span>
              <span className="font-bold text-[#2D5A27]">{({ HANDED_OVER: 'HANDOVER_CONFIRMED', PROCESSING: 'PAYMENT_PROCESSING', RECYCLING_COMPLETED: 'COMPLETED' } as Record<string, string>)[lot.status] || lot.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="py-3 border-b border-[#E0E7E1]"><span className="text-[#5A7A54] text-sm block mb-2">Materials</span>{(lot.items || [{ materialId: lot.materialId, declaredWeight: lot.declaredWeight, unit: lot.unit }]).map(item => <div key={item.materialId} className="flex justify-between font-semibold text-[#1D3124]"><span>{item.materialName || item.materialId}</span><span>{item.declaredWeight} {item.unit}</span></div>)}</div>
            {lot.actualWeight && (
              <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]">
                <span className="text-[#5A7A54] text-sm">Verified Weight</span>
                <span className="font-bold text-[#2D5A27]">{lot.actualWeight} {lot.unit}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]">
              <span className="text-[#5A7A54] text-sm">Created</span>
              <span className="font-semibold text-[#1D3124]">{new Date(lot.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]">
              <span className="text-[#5A7A54] text-sm">Assigned Partner</span>
              <span className="font-semibold text-[#1D3124]">{lot.partnerName || lot.assignedPartnerId || 'Unassigned'}{lot.assignedPartnerType ? ` (${lot.assignedPartnerType})` : ''}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]"><span className="text-[#5A7A54] text-sm">Partner Address</span><span className="font-semibold text-[#1D3124] text-right">{lot.partnerAddress || 'Not assigned'}</span></div>
            <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]"><span className="text-[#5A7A54] text-sm">Total Weight</span><span className="font-semibold text-[#1D3124]">{lot.totalWeight || lot.items?.reduce((sum, item) => sum + item.declaredWeight, 0) || lot.declaredWeight} kg</span></div>
            <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]"><span className="text-[#5A7A54] text-sm">Reference Amount</span><span className="font-semibold text-[#1D3124]">{lot.agreedAmount ? `₹${lot.agreedAmount}` : 'Unavailable'}</span></div>
            <div className="flex justify-between items-center py-3 border-b border-[#E0E7E1]"><span className="text-[#5A7A54] text-sm">Pickup</span><span className="font-semibold text-[#1D3124]">{lot.pickup ? `${lot.pickup.preferredDate} at ${lot.pickup.preferredTime}` : 'Not booked yet'}</span></div>
            <div className="flex justify-between items-center py-3"><span className="text-[#5A7A54] text-sm">Handover OTP</span><span className="font-mono font-bold text-[#1D3124]">{lot.handoverOtp || 'Not available'}</span></div>
            {!lot.assignedPartnerId && !['COMPLETED', 'CANCELLED'].includes(lot.status) && <button onClick={() => navigate(`/collector/lots/${lot.lotId}/partners`)} className="w-full bg-[#2D5A27] text-white font-bold py-3 rounded-xl mb-3">Find Aggregator / Recycler</button>}
            {!lot.pickup && !['COMPLETED', 'CANCELLED'].includes(lot.status) && <button onClick={() => navigate(`/collector/pickup?lotId=${lot.lotId}`)} className="w-full border border-[#2D5A27] text-[#2D5A27] font-bold py-3 rounded-xl">Book Pickup</button>}
          </div>
        </div>

        {/* Traceability Timeline */}
        <div className="bg-white border border-[#E0E7E1] rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#1D3124] mb-6 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-[#5A7A54]" /> Traceability Timeline
          </h3>
          
          <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E0E7E1]">
            
            {/* Real Events */}
            {events.map((ev, i) => (
              <div key={ev.id} className="relative">
                <div className={`absolute -left-[30px] w-6 h-6 rounded-full border-4 border-white flex items-center justify-center ${i === 0 ? 'bg-[#2D5A27]' : 'bg-[#A5D6A7]'}`}>
                  {i === 0 ? <CheckCircle className="w-3 h-3 text-white" /> : <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <h4 className={`font-bold ${i === 0 ? 'text-[#1D3124]' : 'text-[#5A7A54]'}`}>
                  {ev.eventType.replace(/_/g, ' ')}
                </h4>
                <p className="text-xs text-[#5A7A54] mt-1">{new Date(ev.timestamp).toLocaleString()}</p>
                <p className="text-xs text-[#5A7A54] mt-0.5">By {ev.actorRole}</p>
              </div>
            ))}
            
            {/* Future Placeholder if not completed */}
            {lot.status !== 'COMPLETED' && (
              <div className="relative opacity-40">
                <div className="absolute -left-[30px] w-6 h-6 rounded-full border-4 border-white bg-gray-300 flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <h4 className="font-bold text-gray-600">RECYCLING COMPLETED</h4>
                <p className="text-xs text-gray-500 mt-1">Pending</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
