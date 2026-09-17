import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, MapPin, Share2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useTransactionDraft } from '../../context/TransactionDraftContext';
import type { PaymentMethod } from '../../types';

interface PartnerOffer {
  partner: {
    partnerId: string;
    name: string;
    role: 'AGGREGATOR' | 'RECYCLER';
    address: string;
    distanceKm?: number;
    trustScore?: number;
    locationAvailable: boolean;
    eligibilityStatus: 'ELIGIBLE' | 'OUTSIDE_RADIUS' | 'LOCATION_UNAVAILABLE';
  };
  offer: {
    offerId: string;
    grossMaterialValue: number;
    adjustmentAmount: number;
    transportCharge: number;
    processingCharge: number;
    feasibilityCharge: number;
    handlingCharge: number;
    otherCharge: number;
    platformFee: number;
    finalNetPayout: number;
    status: string;
  };
}

const money = (value: number) => `₹${Math.round(value).toLocaleString()}`;
const roleLabel = (role: PartnerOffer['partner']['role']) => role === 'AGGREGATOR' ? 'Aggregator' : 'Recycler';
const distanceLabel = (item: PartnerOffer) => item.partner.distanceKm == null ? 'Location unavailable' : `${item.partner.distanceKm} km away`;

export function PartnerSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, updateDraft } = useTransactionDraft();
  const [lot, setLot] = useState<any>(null);
  const [recommended, setRecommended] = useState<PartnerOffer[]>([]);
  const [invitationPool, setInvitationPool] = useState<PartnerOffer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [paymentPreference, setPaymentPreference] = useState<PaymentMethod>('CASH');
  const [upiId, setUpiId] = useState(user?.mobile || '');
  const [showInvite, setShowInvite] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [directPayment, setDirectPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!upiId && user?.mobile) setUpiId(user.mobile);
  }, [upiId, user?.mobile]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        let currentLot = null as any;
        if (id) {
          const response = await fetch(`/api/collector/lots/${id}`, { credentials: 'include' });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Lot not found.');
          currentLot = data.lot || null;
        } else if (draft?.items.length && draft.location) {
          const response = await fetch('/api/collector/transactions/finalize', {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...draft, location: draft.location, bookPickup: false })
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error || 'Lot creation failed.');
          currentLot = data.lot;
        }
        const items = currentLot?.items || draft?.items || [];
        const location = currentLot?.location || draft?.location || user?.location;
        if (!currentLot || !items.length || !location?.state) throw new Error('Complete Add Material and Check Price before comparing partners.');
        const response = await fetch('/api/collector/partner-offers', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lot: currentLot })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Partner options unavailable.');
        const pool = data.invitationPool || data.partners || [];
        setLot(currentLot);
        setRecommended(data.recommended || []);
        setInvitationPool(pool);
        setSelectedIds(pool.map((item: PartnerOffer) => item.partner.partnerId));
        updateDraft({ currentStep: 'review' });
      } catch (e: any) {
        setError(e.message || 'Could not load partner options.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const referenceValue = Number(lot?.referencePrice?.total) || 0;
  const bestOfferId = useMemo(() => [...recommended]
    .filter(item => item.offer.status === 'VALID')
    .sort((a, b) => b.offer.finalNetPayout - a.offer.finalNetPayout)[0]?.offer.offerId || '', [recommended]);
  const bestOffer = recommended.find(item => item.offer.offerId === bestOfferId) || recommended[0];
  const counts = useMemo(() => ({
    aggregators: invitationPool.filter(item => item.partner.role === 'AGGREGATOR').length,
    recyclers: invitationPool.filter(item => item.partner.role === 'RECYCLER').length
  }), [invitationPool]);
  const otherCost = bestOffer ? bestOffer.offer.processingCharge + bestOffer.offer.feasibilityCharge + bestOffer.offer.handlingCharge + bestOffer.offer.otherCharge : 0;
  const allSelected = invitationPool.length > 0 && selectedIds.length === invitationPool.length;

  const continueToPayment = () => {
    if (!selectedIds.length) {
      setError('Select at least one partner.');
      return;
    }
    setError('');
    setShowInvite(false);
    setShowPayment(true);
  };

  const proceedWithSelectedPartner = () => {
    if (!selectedPartnerId) {
      setError('Select one recommended partner before proceeding.');
      return;
    }
    setError('');
    setDirectPayment(true);
    setShowPayment(true);
  };

  const sendInvitations = async () => {
    if (!lot || !selectedIds.length) return;
    if (paymentPreference === 'UPI' && !upiId.trim()) {
      setError('Enter a UPI or mobile number.');
      return;
    }
    setSending(true);
    setError('');
    try {
      if (directPayment) {
        const selected = recommended.find(item => item.partner.partnerId === selectedPartnerId);
        if (!selected) throw new Error('Select one recommended partner before confirming.');
        const response = await fetch(`/api/collector/lots/${lot.lotId}/select-partner`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedPartner: { id: selected.partner.partnerId }, paymentPreference, upiId: paymentPreference === 'UPI' ? upiId.trim() : undefined })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Partner selection failed.');
        updateDraft({ paymentPreference, selectedPartner: { id: selected.partner.partnerId, name: selected.partner.name, type: selected.partner.role.toLowerCase() as 'aggregator' | 'recycler', address: selected.partner.address }, currentStep: 'review' });
        navigate(`/collector/lots/${lot.lotId}?showQr=true`);
        return;
      }
      const response = await fetch(`/api/collector/lots/${lot.lotId}/quotation-requests`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerIds: selectedIds, paymentPreference, upiId: paymentPreference === 'UPI' ? upiId.trim() : undefined })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Invitation failed.');
      const actualSentCount = Number(data.sentCount || data.requests?.length || selectedIds.length);
      if (actualSentCount < selectedIds.length && !data.duplicate) throw new Error(`Only ${actualSentCount} of ${selectedIds.length} invitations were confirmed.`);
      setSentCount(actualSentCount);
      updateDraft({ paymentPreference, currentStep: 'review' });
      setShowPayment(false);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Invitation failed.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto" /></div>;

  return <div className="space-y-6 pb-6">
    <div className="flex items-center gap-3">
      <button onClick={() => navigate(lot ? `/collector/lots/${lot.lotId}` : '/collector/check-price')} className="w-10 h-10 rounded-full bg-white border flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
      <div><h2 className="text-2xl font-bold text-[#1D3124]">Best Matches for Your Lot</h2><p className="text-sm text-[#5A7A54]">Lot {lot?.lotId} · {lot?.totalWeight || 0} kg · Check Price {money(referenceValue)}</p></div>
    </div>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {success && <div className="rounded-2xl border border-[#A5D6A7] bg-[#E8F3EA] p-5"><p className="font-bold text-[#2D5A27]">Sent to all {sentCount} partners.</p><p className="text-sm text-[#2D5A27] mt-1">You’ll be notified if any partner accepts your lot.</p></div>}

    <section className="bg-[#F4FBF7] border border-[#DDF1E6] rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wide text-[#5A7A54] font-semibold">Compact price breakdown</p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between"><span>Lot value</span><span>{money(referenceValue)}</span></div>
        {bestOffer && <><div className="flex justify-between text-[#0F6B45]"><span>Price adjustment</span><span>+{money(bestOffer.offer.adjustmentAmount)}</span></div><div className="flex justify-between"><span>Collection &amp; logistics</span><span>{bestOffer.offer.transportCharge ? `-${money(bestOffer.offer.transportCharge)}` : money(0)}</span></div>{otherCost > 0 && <div className="flex justify-between"><span>Other applicable cost</span><span>-{money(otherCost)}</span></div>}<div className="flex justify-between"><span>RecySetu fee</span><span>-{money(bestOffer.offer.platformFee)}</span></div><div className="flex justify-between border-t border-[#DDF1E6] pt-2 font-bold text-[#0F6B45]"><span>Best displayed offer</span><span>{money(bestOffer.offer.finalNetPayout)}</span></div></>}
      </div>
    </section>

    <section>
      <div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Best Matches for Your Lot</h3><p className="text-sm text-[#5A7A54]">Recommended from available partner, offer, trust and location data.</p></div><span className="text-sm text-[#5A7A54]">{recommended.length} partners</span></div>
      <div className="grid md:grid-cols-2 gap-4 mt-3">{recommended.map(item => <button type="button" key={item.partner.partnerId} onClick={() => setSelectedPartnerId(item.partner.partnerId)} className={`text-left bg-[#F4FBF7] border rounded-2xl p-4 shadow-sm ${item.partner.partnerId === selectedPartnerId ? 'border-[#0F6B45] ring-2 ring-[#78C7A6]' : item.offer.offerId === bestOfferId ? 'border-[#D49B28]' : 'border-[#DDF1E6]'}`}><div className="flex justify-between gap-3"><div><h4 className="font-bold">{item.partner.name}</h4><p className="text-xs uppercase tracking-wide text-[#5A7A54] mt-1">{roleLabel(item.partner.role)}</p>{item.offer.offerId === bestOfferId && <p className="text-xs font-bold text-[#9A6A00] mt-2">BEST PRICE</p>}{item.partner.partnerId === selectedPartnerId && <p className="text-xs font-bold text-[#0F6B45] mt-2">SELECTED</p>}</div><span className="text-sm font-bold text-[#0F6B45]">{money(item.offer.finalNetPayout)}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5A7A54]"><span className="font-semibold text-[#0F6B45]">Trust Score: {item.partner.trustScore ?? 0}/100</span><span>{distanceLabel(item)}</span></div></button>)}</div>
      {recommended.length === 0 && <p className="text-sm text-[#5A7A54] mt-3">No recommended partners are available from the current partner records.</p>}
      <button type="button" onClick={proceedWithSelectedPartner} disabled={!selectedPartnerId || success} className="mt-4 w-full bg-[#0F6B45] text-white py-3 rounded-xl font-bold disabled:opacity-50">Proceed</button>
    </section>

    <section className="border-t border-[#DDF1E6] pt-5"><div className="rounded-2xl bg-[#EFFAF4] p-5"><h3 className="font-bold text-lg">Find New Quotation</h3><p className="text-sm text-[#5A7A54] mt-1">Invite more nearby partners to review this lot and submit their own offer.</p><button type="button" onClick={() => setShowInvite(true)} disabled={!invitationPool.length || success} className="mt-4 bg-[#0F6B45] text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><Share2 className="w-5 h-5" />Find New Quotation</button></div></section>

    {showInvite && <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center"><div className="w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-[#F4FBF7] rounded-3xl p-6 shadow-xl"><div className="flex items-start justify-between"><div><h3 className="text-xl font-bold">Find New Quotation</h3><p className="text-sm text-[#5A7A54] mt-1">All available partners can review the same Lot and submit their own offer.</p><p className="text-xs text-[#5A7A54] mt-2">Quotation invitations target partners within 0–15 km of your saved location. Location-unavailable partners remain visible.</p></div><button type="button" onClick={() => setShowInvite(false)} aria-label="Close invitation panel"><X className="w-5 h-5" /></button></div><div className="mt-4 flex items-center justify-between"><p className="text-sm font-semibold">{counts.aggregators} Aggregators · {counts.recyclers} Recyclers</p><button type="button" onClick={() => setSelectedIds(allSelected ? [] : invitationPool.map(item => item.partner.partnerId))} className="text-sm font-bold text-[#0F6B45]">{allSelected ? 'Clear All' : 'Select All'}</button></div>{(counts.aggregators < 6 || counts.recyclers < 4) && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">Available real partners: {counts.aggregators} Aggregators and {counts.recyclers} Recyclers. No fictional accounts were added.</p>}<div className="mt-4 grid md:grid-cols-2 gap-3">{invitationPool.map(item => <label key={item.partner.partnerId} className="border border-[#DDF1E6] rounded-xl p-3 bg-white cursor-pointer"><div className="flex items-start gap-3"><input type="checkbox" checked={selectedIds.includes(item.partner.partnerId)} onChange={() => setSelectedIds(current => current.includes(item.partner.partnerId) ? current.filter(value => value !== item.partner.partnerId) : [...current, item.partner.partnerId])} className="mt-1" /><span className="flex-1"><span className="font-semibold block">{item.partner.name}</span><span className="text-xs uppercase text-[#5A7A54]">{roleLabel(item.partner.role)}</span><span className="text-xs text-[#5A7A54] flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{item.partner.address} · {distanceLabel(item)}</span></span>{selectedIds.includes(item.partner.partnerId) && <Check className="w-4 h-4 text-[#0F6B45]" />}</div></label>)}</div><button type="button" onClick={continueToPayment} disabled={!selectedIds.length} className="mt-5 w-full bg-[#0F6B45] text-white py-3 rounded-xl font-bold disabled:opacity-50">Share Lot Details ({selectedIds.length})</button></div></div>}

    {showPayment && <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center"><div className="w-full max-w-md bg-[#F4FBF7] rounded-3xl p-6 shadow-xl"><div className="flex items-start justify-between"><div><h3 className="text-xl font-bold">How do you want to receive your payment?</h3><p className="text-sm text-[#5A7A54] mt-1">This preference is shared with the selected partners.</p></div><button type="button" onClick={() => { setShowPayment(false); setDirectPayment(false); }} aria-label="Close payment panel"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-2 gap-3 mt-5">{(['CASH', 'UPI'] as PaymentMethod[]).map(method => <button key={method} type="button" onClick={() => setPaymentPreference(method)} className={`p-3 rounded-xl border font-bold ${paymentPreference === method ? 'border-[#0F6B45] bg-[#DDF1E6] text-[#0F6B45]' : 'border-[#DDF1E6] bg-white'}`}>{method === 'CASH' ? 'Cash' : 'UPI'}</button>)}</div>{paymentPreference === 'UPI' && <label className="block mt-4 text-sm font-semibold">UPI / Mobile Number<input value={upiId} onChange={event => setUpiId(event.target.value)} placeholder="Registered mobile number" className="w-full mt-2 p-3 border border-[#DDF1E6] rounded-xl bg-white" /><span className="block text-xs text-[#5A7A54] mt-1">Pre-filled from your login number. You can edit it.</span></label>}<button type="button" onClick={sendInvitations} disabled={sending} className="mt-5 w-full bg-[#0F6B45] text-white py-3 rounded-xl font-bold disabled:opacity-50">{sending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : directPayment ? 'Confirm' : 'Submit'}</button></div></div>}
+  </div>;
}
