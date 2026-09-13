import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Loader2, Truck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { getPickupRule, getTotalWeight } from '../../services/pickupRules';

export function CreatePickup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedLotId = searchParams.get('lotId');
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [payment, setPayment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadLots = async () => {
    try {
      const response = await fetch('/api/collector/lots', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load Lots.');
      const available = (data.lots || []).filter((lot: any) => !['CANCELLED', 'COMPLETED', 'RECYCLING_COMPLETED'].includes(lot.status));
      setLots(available);
      const requested = requestedLotId && available.find((lot: any) => lot.lotId === requestedLotId || lot.id === requestedLotId);
      setSelectedLot(requested || (available.length ? available[0] : null));
    } catch (e: any) { setError(e.message || 'Could not load Lots.'); } finally { setLoading(false); }
  };

  useEffect(() => { loadLots(); }, [requestedLotId]);

  const bookPickup = async () => {
    if (!selectedLot || !date || !time || !payment) return;
    setSubmitting(true); setError('');
    try {
      const response = await fetch(`/api/collector/lots/${selectedLot.lotId}/book-pickup`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferredDate: date, preferredTime: time, paymentPreference: payment }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Pickup booking failed.');
      navigate(`/collector/lots/${data.lot.lotId || selectedLot.lotId}`);
    } catch (e: any) { setError(e.message || 'Pickup booking failed.'); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto" /></div>;
  if (!lots.length) return <div className="bg-white border border-[#E0E7E1] rounded-3xl p-8 text-center space-y-4"><Truck className="w-12 h-12 mx-auto text-[#5A7A54]" /><h2 className="text-xl font-bold">Track Pickup</h2><p className="text-[#5A7A54]">No Lots available for pickup yet.</p><button onClick={() => navigate('/collector/material')} className="bg-[#2D5A27] text-white font-bold px-5 py-3 rounded-xl">Generate Pickup Request</button></div>;

  const items = selectedLot?.items || [{ materialName: selectedLot?.materialId, declaredWeight: selectedLot?.declaredWeight, unit: selectedLot?.unit || 'kg' }];
  const totalWeight = getTotalWeight(items);
  const pickupRule = getPickupRule(totalWeight);
  const pickup = selectedLot?.pickup;

  return <div className="space-y-5 pb-6"><div className="flex items-center"><button onClick={() => navigate('/collector/dashboard')} className="w-10 h-10 rounded-full bg-white border mr-4 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-2xl font-bold">Track Pickup</h2></div>
    {lots.length > 1 && <div className="flex gap-2 overflow-x-auto pb-2">{lots.filter(lot => lot.status !== 'CANCELLED').map(lot => <button key={lot.id} onClick={() => setSelectedLot(lot)} className={`shrink-0 p-3 rounded-xl border text-left ${selectedLot?.id === lot.id ? 'border-[#2D5A27] bg-[#E8F3EA]' : 'border-[#E0E7E1] bg-white'}`}><b>{lot.lotId}</b><span className="block text-xs text-[#5A7A54]">{lot.totalWeight || getTotalWeight(lot.items || [])} kg</span></button>)}</div>}
    {selectedLot && <div className="bg-white border border-[#E0E7E1] rounded-3xl p-6 space-y-5"><div className="flex justify-between"><div><p className="text-sm text-[#5A7A54]">Lot ID</p><p className="text-xl font-bold">{selectedLot.lotId}</p></div><span className="px-3 py-2 rounded-xl bg-orange-50 text-orange-700 font-bold text-sm">{selectedLot.status.replace(/_/g, ' ')}</span></div><div className="space-y-2">{items.map((item: any) => <div key={item.materialId || item.materialName} className="flex justify-between border-b py-2"><span>{item.materialName || item.materialId}</span><span>{item.declaredWeight} {item.unit}</span></div>)}</div><div className="rounded-xl bg-[#F9FBFA] p-4 text-sm"><p><b>Total Weight:</b> {totalWeight} kg</p><p><b>Pickup Eligibility:</b> Available</p><p><b>Pickup Fee:</b> {pickupRule.fee ? `₹${pickupRule.fee}` : '₹0'}</p><p className="font-bold text-[#2D5A27] mt-1">{pickupRule.label}</p></div>{pickup ? <div className="border-t pt-4 space-y-2 text-sm"><h3 className="font-bold text-lg">Pickup booked</h3><p><b>Status:</b> {pickup.status}</p><p><b>Date:</b> {pickup.preferredDate}</p><p><b>Time:</b> {pickup.preferredTime}</p><p><b>Payment:</b> {pickup.paymentPreference}</p><p><b>Partner:</b> {pickup.partnerName || selectedLot.partnerName || 'Pending assignment'}</p></div> : <div className="border-t pt-4 space-y-4"><h3 className="font-bold text-lg">Pickup not booked yet</h3><div><label className="font-bold flex items-center gap-2 mb-2"><Calendar className="w-4 h-4" /> Pickup date</label><input type="date" value={date} onChange={event => setDate(event.target.value)} className="w-full p-3 border rounded-xl" /></div><div><label className="font-bold flex items-center gap-2 mb-2"><Clock className="w-4 h-4" /> Pickup time</label><select value={time} onChange={event => setTime(event.target.value)} className="w-full p-3 border rounded-xl"><option value="">Select a time slot</option><option>Morning (9 AM - 12 PM)</option><option>Afternoon (12 PM - 3 PM)</option><option>Evening (3 PM - 6 PM)</option></select></div><div><p className="font-bold mb-2">Payment preference</p><div className="flex gap-3"><button onClick={() => setPayment('CASH')} className={`flex-1 p-3 border rounded-xl ${payment === 'CASH' ? 'border-[#2D5A27] bg-[#E8F3EA]' : ''}`}>Cash</button><button onClick={() => setPayment('UPI')} className={`flex-1 p-3 border rounded-xl ${payment === 'UPI' ? 'border-[#2D5A27] bg-[#E8F3EA]' : ''}`}>UPI</button></div></div>{error && <p className="text-red-600 text-sm">{error}</p>}<button disabled={!date || !time || !payment || submitting} onClick={bookPickup} className="w-full bg-[#2D5A27] text-white font-bold py-4 rounded-xl disabled:opacity-50">{submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Proceed to Book Pickup'}</button></div>}</div>}
  </div>;
}
