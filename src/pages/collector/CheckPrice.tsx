import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { MATERIAL_CATEGORIES } from '../../types';
import { useTransactionDraft } from '../../context/TransactionDraftContext';
import { locationLabel } from '../../services/location';
import { resolveCustomMaterialPrice } from '../../services/materialPricing';
import { referencePrice } from '../../services/pricingCatalog';

const primaryMaterialIds = ['mobile', 'laptop', 'desktop', 'led-tv', 'refrigerator', 'washing-machine', 'air-conditioner', 'battery', 'printer', 'pcb'];

export function CheckPrice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, beginDraft, updateDraft, addItem } = useTransactionDraft();
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [weight, setWeight] = useState('');
  const [customName, setCustomName] = useState('');
  const [search, setSearch] = useState('');
  const [pricing, setPricing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const profileLocation = useMemo(
    () => user?.location || (user?.address ? { formattedAddress: user.address, latitude: user.latitude, longitude: user.longitude } : undefined),
    [user?.address, user?.latitude, user?.longitude, user?.location]
  );
  const items = draft?.items || [];
  const visibleMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    const candidates = query ? MATERIAL_CATEGORIES.filter(item => `${item.name} ${item.category} ${item.id}`.toLowerCase().includes(query) || (item.id === 'mobile' && ['phone', 'cell'].some(alias => query.includes(alias)))) : MATERIAL_CATEGORIES.filter(item => primaryMaterialIds.includes(item.id));
    return candidates.slice(0, 10);
  }, [search]);

  useEffect(() => {
    if (!draft) {
      beginDraft('check-price');
      return;
    }

    if (profileLocation?.state && (!draft.location || draft.location.formattedAddress !== profileLocation.formattedAddress)) {
      updateDraft({ location: profileLocation, currentStep: 'price' });
    }
  }, [draft, profileLocation]);

  const addMaterial = () => {
    const category = MATERIAL_CATEGORIES.find(item => item.id === selectedMaterial);
    const value = Number(weight);
    if (!category || !Number.isFinite(value) || value <= 0) return setError('Enter a valid weight in kilograms.');
    if (selectedMaterial === 'other' && customName.trim().length < 2) return setError('Enter the material name for Other.');
    addItem({ materialId: category.id, materialName: selectedMaterial === 'other' ? customName.trim() : category.name, declaredWeight: value, unit: 'kg' });
    setSelectedMaterial(''); setWeight(''); setCustomName(''); setError('');
  };

  const calculateReference = async () => {
    const location = profileLocation;
    if (!location?.state) return setError('Your profile location has no state. Update it in Profile before checking price.');
    if (!items.length) return setError('Add at least one material first.');
    setPricing(true); setError('');
    try {
      const pricedItems = await Promise.all(items.map(async item => {
        if (item.materialId === 'other') {
          const result = await resolveCustomMaterialPrice(item.materialName || '', location);
          return { ...item, materialName: item.materialName || result.materialName, materialCategory: result.category, estimatedRate: result.referencePricePerKg, estimatedValue: result.referencePricePerKg * item.declaredWeight, pricingConfidence: result.confidence };
        }
        const price = referencePrice(item.materialId, location.state);
        if (!price) throw new Error(`No reference price is configured for ${item.materialName || item.materialId}.`);
        return { ...item, materialCategory: price.category, estimatedRate: price.pricePerKg, estimatedValue: price.pricePerKg * item.declaredWeight };
      }));
      const total = pricedItems.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
      const totalWeight = pricedItems.reduce((sum, item) => sum + item.declaredWeight, 0);
      updateDraft({ location, items: pricedItems, referencePrice: { rate: total / totalWeight, total, source: 'Configured DEMO/REFERENCE catalogue', region: location.state }, currentStep: 'review' });
    } catch (e: any) { setError(e.message || 'Reference price unavailable.'); }
    finally { setPricing(false); }
  };

  const createLot = async () => {
    if (!draft?.referencePrice || !profileLocation || !draft.items.length) return;
    setCreating(true); setError('');
    try {
      const response = await fetch('/api/collector/transactions/finalize', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, location: profileLocation, bookPickup: false }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Lot creation failed.');
      navigate(`/collector/partners?id=${data.lot.lotId}`);
    } catch (e: any) { setError(e.message || 'Lot creation failed.'); }
    finally { setCreating(false); }
  };

  return <div className="space-y-6 pb-6 max-w-2xl mx-auto">
    <div className="flex items-center"><button onClick={() => navigate('/collector/material')} className="w-10 h-10 rounded-full bg-white border border-[#E0E7E1] flex items-center justify-center mr-4" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button><div><h2 className="text-2xl font-bold text-[#1D3124]">Today's Reference Price</h2><p className="text-sm text-[#5A7A54]">Estimated market value, not a guaranteed partner offer.</p></div></div>
    <div className="bg-white border border-[#E0E7E1] rounded-3xl p-6 shadow-sm space-y-6">
      <section><h3 className="font-bold text-lg mb-3">Materials</h3><div className="relative mb-3"><Search className="absolute left-3 top-3 w-4 h-4 text-[#5A7A54]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search material..." className="w-full pl-9 p-3 border border-[#E0E7E1] rounded-xl" /></div><div className="grid grid-cols-2 gap-2">{visibleMaterials.map(category => <button key={category.id} onClick={() => setSelectedMaterial(category.id)} className={`p-3 rounded-xl border text-left text-sm ${selectedMaterial === category.id ? 'border-[#2D5A27] bg-[#E8F3EA] font-bold' : 'border-[#E0E7E1]'}`}>{category.name}</button>)}</div><button onClick={() => { setSearch(''); setSelectedMaterial('other'); }} className="mt-3 text-sm font-bold text-[#2D5A27]">View more materials / Other</button>{selectedMaterial === 'other' && <input value={customName} onChange={event => setCustomName(event.target.value)} placeholder="Please tell us the material name" className="w-full mt-3 p-3 border rounded-xl" />}<div className="flex gap-3 mt-3"><input type="number" min="0.1" step="0.1" value={weight} onChange={event => setWeight(event.target.value)} placeholder="Weight in kg" className="flex-1 p-3 border rounded-xl" /><button disabled={!selectedMaterial || Number(weight) <= 0} onClick={addMaterial} className="bg-[#2D5A27] text-white px-4 rounded-xl font-bold disabled:opacity-50">Add</button></div></section>
      <section className="border-t border-[#E0E7E1] pt-5"><h3 className="font-bold text-lg">Pricing location</h3>{profileLocation?.state ? <div className="mt-3 bg-[#E8F3EA] rounded-xl p-4"><p className="font-bold text-[#2D5A27]">{locationLabel(profileLocation)}</p><p className="text-sm">{profileLocation.formattedAddress}</p><button onClick={() => navigate('/collector/profile')} className="mt-2 text-sm font-bold text-[#2D5A27]">Change location in Profile</button></div> : <p className="mt-3 text-sm text-red-600">No saved location. Update your Profile before checking price.</p>}</section>
      {items.length > 0 && <section className="border-t border-[#E0E7E1] pt-5 space-y-2">{items.map((item, index) => <div key={`${item.materialId}-${index}`} className="flex justify-between border-b border-[#E0E7E1] py-2"><span>{item.materialName || item.materialId}</span><span>{item.declaredWeight} kg {item.estimatedValue != null && `· ₹${item.estimatedValue.toLocaleString()}`}</span></div>)}</section>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={!items.length || !profileLocation?.state || pricing} onClick={calculateReference} className="w-full bg-[#1D3124] text-white py-4 rounded-xl font-bold disabled:opacity-50">{pricing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Show Today’s Reference Price'}</button>
      {draft?.referencePrice && <section className="border-t border-[#E0E7E1] pt-5"><p className="text-sm text-[#5A7A54]">Estimated value at {draft.referencePrice.region} · Updated {new Date().toLocaleDateString()}</p><p className="text-3xl font-bold text-[#2D5A27] mt-1">₹{draft.referencePrice.total.toLocaleString()}</p><p className="text-sm text-[#5A7A54] mt-2">Based on the configured reference catalogue. Final value may change after inspection or partner quotation.</p><div className="grid md:grid-cols-2 gap-3 mt-5"><button onClick={() => navigate('/collector/partners')} className="border border-[#2D5A27] text-[#2D5A27] py-4 rounded-xl font-bold">Sell This Material</button><button disabled={creating} onClick={createLot} className="bg-[#2D5A27] text-white py-4 rounded-xl font-bold">{creating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Lot for Later'}</button></div></section>}
    </div>
  </div>;
}
