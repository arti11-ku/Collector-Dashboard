import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, MapPin, Phone } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useTransactionDraft } from '../../context/TransactionDraftContext';

interface PartnerOffer {
  partner: { partnerId: string; name: string; role: 'AGGREGATOR' | 'RECYCLER'; phone: string; address: string; distanceKm: number; demo: boolean; quotationEligible?: boolean };
  offer: { offerId: string; pricePerKg: number; grossMaterialValue: number; adjustmentAmount: number; transportCharge: number; processingCharge: number; feasibilityCharge: number; handlingCharge: number; otherCharge: number; finalNetPayout: number };
}

const money = (value: number) => `₹${Math.round(value).toLocaleString()}`;

export function PartnerSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, updateDraft } = useTransactionDraft();
  const [lot, setLot] = useState<any>(null);
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [selectedQuotationPartners, setSelectedQuotationPartners] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quotationSummary, setQuotationSummary] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        let currentLot = null as any;
        if (id) {
          const lotResponse = await fetch(`/api/collector/lots/${id}`, { credentials: 'include' });
          const lotData = await lotResponse.json();
          if (!lotResponse.ok) throw new Error(lotData.error || 'Lot not found.');
          currentLot = lotData?.lot || null;
        }

        const resolvedItems = currentLot?.items || draft?.items || [];
        const resolvedLocation = currentLot?.location || draft?.location || user?.location;

        if (!resolvedItems.length || !resolvedLocation?.state || resolvedLocation.latitude == null || resolvedLocation.longitude == null) {
          setLot(currentLot);
          setOffers([]);
          setError('Add materials and confirm your saved location before comparing nearby Aggregators and Recyclers.');
          return;
        }

        const response = await fetch('/api/collector/partner-offers', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lot: currentLot, items: resolvedItems, location: resolvedLocation }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Partner offers unavailable.');
        setLot(currentLot);
        setOffers(data.partners || []);
        if (!currentLot && draft) {
          updateDraft({
            referencePrice: {
              rate: data.totalWeight ? data.referenceValue / data.totalWeight : 0,
              total: data.referenceValue,
              source: 'Configured reference catalogue',
              region: resolvedLocation.state || 'Saved location'
            },
            currentStep: 'review'
          });
        }
      } catch (e: any) {
        setError(e.message || 'Could not load partner options.');
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    if (id || draft?.items?.length) {
      load();
    } else {
      setLoading(false);
      setOffers([]);
    }
  }, [id, draft?.items, draft?.location, user?.location]);

  const bestOfferId = useMemo(() => offers.reduce((best, item) => item.offer.finalNetPayout > (best?.offer.finalNetPayout || -1) ? item : best, null as PartnerOffer | null)?.offer.offerId || '', [offers]);
  const selectPartner = async (item: PartnerOffer) => {
    setSelecting(true); setError('');
    try {
      const selectedPartner = { id: item.partner.partnerId, name: item.partner.name, type: item.partner.role.toLowerCase() as 'aggregator' | 'recycler', address: item.partner.address };
      updateDraft({ selectedPartner, currentStep: 'review' });
      if (!lot) {
        if (!draft?.items.length || !draft.location) throw new Error('Add materials and confirm your saved location first.');
        const response = await fetch('/api/collector/transactions/finalize', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, draftId: draft.draftId, items: draft.items, location: draft.location, selectedPartner, referencePrice: draft.referencePrice, bookPickup: false }) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Lot creation failed.');
        window.alert(`${selectedPartner.name} selected successfully.`);
        navigate(`/collector/pickup?lotId=${data.lot.lotId}`);
      } else {
        const response = await fetch(`/api/collector/lots/${lot.lotId}/select-partner`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selectedPartner, offer: item.offer }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Partner selection failed.');
        updateDraft({ selectedPartner, currentStep: 'review' });
        window.alert(`${selectedPartner.name} selected successfully.`);
        navigate(`/collector/pickup?lotId=${data.lot.lotId || lot.lotId}`);
      }
    } catch (e: any) { setError(e.message || 'Partner selection failed.'); }
    finally { setSelecting(false); }
  };

  const invite = async (partnerIdsOverride?: string[]) => {
    setSending(true); setError(''); setSuccess('');
    try {
      const trimmedMessage = typeof message === 'string' ? message.trim() : '';

      let lotId = lot?.lotId;
      let partnerIds = partnerIdsOverride ?? selectedQuotationPartners;

      if (!partnerIds.length) {
        throw new Error('Select at least one nearby Aggregator or Recycler first.');
      }

      if (!lotId) {
        if (!draft?.items.length || !draft.location) throw new Error('Add materials and confirm your saved location first.');
        const finalize = await fetch('/api/collector/transactions/finalize', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, draftId: draft.draftId, items: draft.items, location: draft.location, referencePrice: draft.referencePrice, bookPickup: false }) });
        const finalized = await finalize.json();
        if (!finalize.ok || !finalized.success) throw new Error(finalized.error || 'Lot creation failed.');
        lotId = finalized.lot.lotId;
      }

      const response = await fetch(`/api/collector/lots/${lotId}/quotation-requests`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partnerIds, ...(trimmedMessage ? { message: trimmedMessage } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Quotation request failed.');

      const invitedPartnerNames = partnerIds
        .map(partnerId => offers.find(item => item.partner.partnerId === partnerId)?.partner.name)
        .filter(Boolean);
      const partnerTypes = [...new Set(partnerIds
        .map(partnerId => offers.find(item => item.partner.partnerId === partnerId)?.partner.role)
        .filter(Boolean))];

      const summary = {
        status: 'Sent',
        lotId: lotId || '—',
        requestedAt: new Date().toISOString(),
        message: trimmedMessage || 'No additional quotation message provided.',
        invitedPartnerCount: partnerIds.length,
        partnerNames: invitedPartnerNames,
        partnerTypes,
        radiusKm: 10,
        location: lot?.location || draft?.location || null,
      };

      setQuotationSummary(summary);
      setSelectedQuotationPartners([]);
      setMessage('');
      setSuccess(`Quotation request sent successfully to nearby ${partnerTypes.length ? partnerTypes.join(' and ') : 'Aggregators and Recyclers'}. Response pending.`);
    } catch (e: any) { setError(e.message || 'Quotation request failed.'); }
    finally { setSending(false); }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto" /></div>;
  const referenceValue = offers[0]?.offer.grossMaterialValue || 0;
  return <div className="space-y-6 pb-6"><div className="flex items-center gap-3"><button onClick={() => navigate(id ? `/collector/lots/${id}` : '/collector/material')} className="w-10 h-10 rounded-full bg-white border flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button><div><h2 className="text-2xl font-bold text-[#1D3124]">Choose Aggregator / Recycler</h2><p className="text-sm text-[#5A7A54]">Reference estimate for this transaction: {money(referenceValue)}</p></div></div>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{['AGGREGATOR', 'RECYCLER'].map(role => <section key={role}><h3 className="font-bold text-lg text-[#1D3124]">{role === 'AGGREGATOR' ? 'Aggregators' : 'Recyclers'}</h3><div className="grid md:grid-cols-2 gap-4 mt-3">{offers.filter(item => item.partner.role === role).slice(0, 2).map(item => { const selected = selectedQuotationPartners.includes(item.partner.partnerId); const best = item.offer.offerId === bestOfferId; return <article key={item.partner.partnerId} className={`bg-white border rounded-2xl p-5 shadow-sm ${best ? 'border-[#D49B28]' : selected ? 'border-[#2D5A27]' : 'border-[#E0E7E1]'}`}><div className="flex justify-between gap-3"><div><h4 className="font-bold">{item.partner.name}</h4><p className="text-xs text-[#5A7A54]">{item.partner.role} · {item.partner.demo ? 'DEMO/PROTOTYPE RECORD' : 'VERIFIED'}</p>{best && <p className="text-xs font-bold text-[#9A6A00] mt-1">BEST OFFER</p>}</div><span className="text-sm font-bold text-[#2D5A27]">{item.partner.distanceKm} km</span></div><p className="text-sm mt-3 flex gap-2"><MapPin className="w-4 h-4 shrink-0 text-[#5A7A54]" />{item.partner.address}</p><p className="text-sm mt-2 flex gap-2"><Phone className="w-4 h-4 text-[#5A7A54]" />{item.partner.phone}</p><div className="mt-4 rounded-xl bg-[#F9FBFA] p-3 text-sm space-y-1"><p>Reference estimated value <b className="float-right">{money(item.offer.grossMaterialValue)}</b></p><p>Partner offer adjustment <span className="float-right">{item.offer.adjustmentAmount >= 0 ? '+' : '-'} {money(Math.abs(item.offer.adjustmentAmount))}</span></p><p>Transport <span className="float-right">- {money(item.offer.transportCharge)}</span></p><p>Processing / Feasibility <span className="float-right">- {money(item.offer.processingCharge + item.offer.feasibilityCharge)}</span></p><p>Handling / Sorting <span className="float-right">- {money(item.offer.handlingCharge)}</span></p><p>Other charges <span className="float-right">- {money(item.offer.otherCharge)}</span></p><p className="border-t pt-2 mt-2 font-bold">FINAL NET PAYOUT <b className="float-right text-[#2D5A27]">{money(item.offer.finalNetPayout)}</b></p></div><div className="flex gap-2 mt-4"><button disabled={selecting} onClick={() => selectPartner(item)} className="flex-1 bg-[#2D5A27] text-white py-2 rounded-xl font-bold disabled:opacity-50">Select Partner</button><button onClick={async () => {
  const nextSelection = selected ? selectedQuotationPartners.filter(value => value !== item.partner.partnerId) : [...selectedQuotationPartners, item.partner.partnerId];
  setSelectedQuotationPartners(nextSelection);
  if (!selected) {
    await invite([item.partner.partnerId]);
  }
}} className={`px-3 py-2 rounded-xl border text-xs font-bold ${selected ? 'bg-[#E8F3EA] border-[#2D5A27]' : 'border-[#E0E7E1]'}`}>{selected ? 'Quotation selected' : 'Invite'}</button></div></article>; })}</div></section>)}<section className="border-t border-[#E0E7E1] pt-5 space-y-3"><h3 className="font-bold text-lg">Want a fresh quotation?</h3><p className="text-sm text-[#5A7A54]">Select one or more nearby partners above. Quotation requests use the saved location and a 0–10 km radius.</p><textarea value={message} onChange={event => { setMessage(event.target.value); setError(''); setSuccess(''); }} className="w-full p-3 border rounded-xl" rows={2} placeholder="Please share your best net quotation for this Lot." /><button disabled={sending} onClick={() => invite()} className="bg-white border border-[#2D5A27] text-[#2D5A27] py-3 px-5 rounded-xl font-bold disabled:opacity-50">{sending ? 'Sending...' : 'Invite Quotation'}</button>{quotationSummary && <div className="rounded-2xl border border-[#E0E7E1] bg-[#F8FBF8] p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-[#5A7A54] font-semibold">Quotation Request</p><h4 className="font-bold text-[#1D3124]">Status: {quotationSummary.status}</h4></div><span className="rounded-full bg-[#E8F3EA] text-[#2D5A27] px-2.5 py-1 text-xs font-semibold">Pending Response</span></div><div className="grid gap-2 text-sm text-[#1D3124]"><p><span className="text-[#5A7A54]">Lot ID:</span> {quotationSummary.lotId}</p><p><span className="text-[#5A7A54]">Date & Time:</span> {new Date(quotationSummary.requestedAt).toLocaleString()}</p><p><span className="text-[#5A7A54]">Message:</span> {quotationSummary.message}</p><p><span className="text-[#5A7A54]">Nearby partners invited:</span> {quotationSummary.invitedPartnerCount}</p>{quotationSummary.partnerTypes.length > 0 && <p><span className="text-[#5A7A54]">Partner type:</span> {quotationSummary.partnerTypes.join(', ')}</p>}{quotationSummary.partnerNames.length > 0 && <p><span className="text-[#5A7A54]">Invited partners:</span> {quotationSummary.partnerNames.join(', ')}</p>}{quotationSummary.location?.state && <p><span className="text-[#5A7A54]">Location/radius:</span> {quotationSummary.location.state} · 0–{quotationSummary.radiusKm} km</p>}</div></div>}</section></div>;
}
