import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Loader2, Minus, Plus, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { MATERIAL_CATEGORIES } from '../../types';
import { useTransactionDraft } from '../../context/TransactionDraftContext';
import { resolveCustomMaterialPrice, CustomMaterialPrice } from '../../services/materialPricing';
import { referencePrice } from '../../services/pricingCatalog';

interface DetectionResult {
  materialName: string;
  materialId: string | null;
  category: string;
  confidence: number;
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export function AddMaterial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, beginDraft, updateDraft, addItem, updateItem, removeItem } = useTransactionDraft();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [customName, setCustomName] = useState('');
  const [customResolution, setCustomResolution] = useState<CustomMaterialPrice | null>(null);
  const [resolvingCustom, setResolvingCustom] = useState(false);
  const [customError, setCustomError] = useState('');
  const [imageData, setImageData] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const items = draft?.items || [];
  const profileLocation = useMemo(
    () => user?.location || (user?.address ? { formattedAddress: user.address, latitude: user.latitude, longitude: user.longitude } : undefined),
    [user?.address, user?.latitude, user?.longitude, user?.location]
  );

  useEffect(() => {
    if (!draft) {
      beginDraft('material');
      return;
    }

    if (!profileLocation) return;

    const hasMissingStandardPrice = draft.items.some(item => item.materialId !== 'other' && !item.estimatedRate);
    if (!draft.location || hasMissingStandardPrice) {
      const pricedItems = draft.items.map(item => {
        if (item.materialId === 'other' || item.estimatedRate) return item;
        const price = referencePrice(item.materialId, profileLocation.state);
        return price ? { ...item, materialCategory: price.category, estimatedRate: price.pricePerKg, estimatedValue: price.pricePerKg * item.declaredWeight } : item;
      });
      updateDraft({ location: profileLocation, items: pricedItems });
    }
  }, [draft, profileLocation]);

  const chooseImage = () => imageInputRef.current?.click();

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setCameraError('');
    setDetection(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCameraError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setCameraError('This image is too large. Please choose an image under 6 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageData(reader.result);
        setImageMimeType(file.type);
      } else {
        setCameraError('The image could not be read. Please try another image.');
      }
    };
    reader.onerror = () => setCameraError('The image could not be read. Please try another image.');
    reader.readAsDataURL(file);
  };

  const identifyImage = async () => {
    if (!imageData || !imageMimeType || analyzing) return;
    setAnalyzing(true);
    setCameraError('');
    setDetection(null);
    try {
      const response = await fetch('/api/ai/identify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mimeType: imageMimeType })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI identification failed.');
      setDetection(data);
    } catch (error: any) {
      setCameraError(error.message || 'AI identification failed. Please retake the image or choose the material manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmDetection = () => {
    if (!detection) return;
    if (detection.confidence < 0.6) {
      setDetection(null);
      setImageData('');
      setImageMimeType('');
      setSelectedMaterial('');
      setCameraError('Choose the material manually or retake the photo.');
      return;
    }
    const canonical = MATERIAL_CATEGORIES.find(category => category.id === detection.materialId);
    if (canonical && detection.materialId !== 'other') {
      setSelectedMaterial(canonical.id);
      setCustomName('');
    } else {
      setSelectedMaterial('other');
      setCustomName(detection.materialName);
    }
    setDetection(null);
    setImageData('');
    setImageMimeType('');
  };

  const addMaterial = async () => {
    const category = MATERIAL_CATEGORIES.find(item => item.id === selectedMaterial);
    const weight = Number(quantity);
    if (!category || !Number.isFinite(weight) || weight <= 0) return;
    if (selectedMaterial === 'other' && customName.trim().length < 2) {
      setCustomError('Enter a material name for Other.');
      return;
    }
    if (selectedMaterial === 'other' && draft?.location && !customResolution) {
      setResolvingCustom(true);
      setCustomError('');
      try {
        setCustomResolution(await resolveCustomMaterialPrice(customName, draft.location));
      } catch (error: any) {
        setCustomError(error.message || 'Price estimate unavailable — please verify the material.');
      } finally {
        setResolvingCustom(false);
      }
      return;
    }
    const actualName = selectedMaterial === 'other' ? customResolution?.materialName || customName.trim() : category.name;
    const standardPrice = profileLocation?.state ? referencePrice(category.id, profileLocation.state) : null;
    const customRate = selectedMaterial === 'other' ? customResolution?.referencePricePerKg : standardPrice?.pricePerKg;
    beginDraft('material');
    addItem({ materialId: category.id, materialName: actualName, materialCategory: customResolution?.category || standardPrice?.category || category.name, declaredWeight: weight, unit: 'kg', estimatedRate: customRate, estimatedValue: customRate ? customRate * weight : undefined, pricingConfidence: customResolution?.confidence });
    setSelectedMaterial('');
    setQuantity('');
    setCustomName('');
    setCustomResolution(null);
    setCustomError('');
  };

  return (
    <div className="space-y-6 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate('/collector/dashboard')} className="w-10 h-10 rounded-full bg-white border border-[#E0E7E1] flex items-center justify-center text-[#5A7A54] mr-4" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-2xl font-bold text-[#1D3124]">Add Materials</h2>
      </div>

      <div className="bg-white border border-[#E0E7E1] rounded-[32px] p-6 md:p-8 shadow-sm space-y-7">
        <section className="rounded-2xl border-2 border-[#2D5A27] bg-[#F4FAF4] p-5 space-y-4" aria-labelledby="ai-camera-heading">
          <div><h3 id="ai-camera-heading" className="text-xl font-bold text-[#1D3124]">Identify E-Waste with AI Camera</h3><p className="text-sm text-[#5A7A54] mt-1">Capture or upload an image. AI identifies the material; you enter the actual weight.</p></div>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleImageSelected} />
          <div className="flex flex-col sm:flex-row gap-3"><button type="button" onClick={chooseImage} className="flex-1 bg-[#2D5A27] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Camera className="w-5 h-5" /> Scan With Camera</button><button type="button" onClick={chooseImage} className="flex-1 border border-[#2D5A27] text-[#2D5A27] font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Upload className="w-5 h-5" /> Upload Image</button></div>
          {imageData && <div className="space-y-3"><img src={imageData} alt="Captured e-waste preview" className="w-full max-h-64 object-contain rounded-xl border border-[#E0E7E1] bg-white" /><div className="flex gap-3"><button type="button" onClick={chooseImage} disabled={analyzing} className="flex-1 border border-[#E0E7E1] text-[#5A7A54] font-bold py-3 rounded-xl">Retake</button><button type="button" onClick={identifyImage} disabled={analyzing} className="flex-1 bg-[#1D3124] text-white font-bold py-3 rounded-xl">{analyzing ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Analyzing e-waste...</span> : 'Use This Image'}</button></div></div>}
          {detection && <div className="rounded-xl bg-white border border-[#A5D6A7] p-4 space-y-2"><p className="font-bold text-[#2D5A27]">Detected Material: {detection.materialName}</p><p className="text-sm">Category: {detection.category}</p><p className="text-sm">Confidence: {detection.confidence >= 0.8 ? 'High' : detection.confidence >= 0.6 ? 'Medium' : 'Low'}</p>{detection.confidence < 0.6 ? <p className="text-sm text-orange-700">I’m not fully sure what this item is. Choose a material or retake the photo.</p> : <p className="text-sm text-[#5A7A54]">Confirm this result to add it to the draft.</p>}<div className="flex gap-3 pt-2"><button type="button" onClick={confirmDetection} className="flex-1 bg-[#2D5A27] text-white font-bold py-3 rounded-xl">{detection.confidence < 0.6 ? 'Choose Material' : 'Confirm Material'}</button><button type="button" onClick={() => { setDetection(null); chooseImage(); }} className="flex-1 border border-[#E0E7E1] text-[#5A7A54] font-bold py-3 rounded-xl">Retake Photo</button></div></div>}
          {cameraError && <p className="text-sm text-red-600" role="alert">{cameraError}</p>}
        </section>

        <section className="border-t border-[#E0E7E1] pt-6 space-y-4" aria-labelledby="manual-material-heading">
          <h3 id="manual-material-heading" className="text-lg font-bold text-[#1D3124]">Add Material Manually</h3>
          {items.length > 0 && <div className="space-y-3">{items.map((item, index) => <div key={`${item.materialId}-${index}`} className="flex items-center gap-3 border border-[#E0E7E1] rounded-xl p-3"><span className="flex-1 font-semibold text-[#1D3124]"><span className="block">{item.materialName || item.materialId}</span><span className="block text-sm font-normal text-[#5A7A54]">{item.declaredWeight} kg</span><span className="block text-xs font-normal text-[#5A7A54]">{item.estimatedRate ? `Estimated value: ₹${(item.estimatedRate * item.declaredWeight).toLocaleString()}` : 'Reference estimate pending saved location'}</span></span><button type="button" onClick={() => updateItem(index, { declaredWeight: Math.max(0.1, item.declaredWeight - 0.1) })} className="p-2 border rounded-lg" aria-label="Decrease weight"><Minus className="w-4 h-4" /></button><input type="number" min="0.1" step="0.1" value={item.declaredWeight} onChange={event => updateItem(index, { declaredWeight: Number(event.target.value) })} className="w-24 p-2 border rounded-lg text-center" aria-label={`${item.materialName || item.materialId} weight`} /><span className="text-sm text-[#5A7A54]">kg</span><button type="button" onClick={() => updateItem(index, { declaredWeight: item.declaredWeight + 0.1 })} className="p-2 border rounded-lg" aria-label="Increase weight"><Plus className="w-4 h-4" /></button><button type="button" onClick={() => removeItem(index)} className="p-2 text-red-600" aria-label="Remove material"><Trash2 className="w-4 h-4" /></button></div>)}<p className="text-right text-sm font-bold text-[#2D5A27]">Total Estimated Value: ₹{items.reduce((total, item) => total + (item.estimatedRate ? item.estimatedRate * item.declaredWeight : 0), 0).toLocaleString()}</p></div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{MATERIAL_CATEGORIES.map(category => <button type="button" key={category.id} onClick={() => { setSelectedMaterial(category.id); setCustomResolution(null); setCustomError(''); }} className={`p-3 rounded-xl border text-left text-sm ${selectedMaterial === category.id ? 'border-[#2D5A27] bg-[#E8F3EA] font-bold' : 'border-[#E0E7E1]'}`}>{category.name}</button>)}</div>
          {selectedMaterial === 'other' && <div className="space-y-2"><label className="block text-sm font-bold text-[#1D3124]">Material name</label><input value={customName} onChange={event => { setCustomName(event.target.value); setCustomResolution(null); setCustomError(''); }} placeholder="Enter material name" className="w-full p-3 border border-[#E0E7E1] rounded-xl" />{customResolution && <div className="rounded-xl bg-[#E8F3EA] p-3 text-sm"><p className="font-bold text-[#2D5A27]">Detected material: {customResolution.materialName}</p><p>Reference price: ₹{customResolution.referencePricePerKg}/kg</p><p className="mt-2 text-[#5A7A54]">Confirm below to add this item.</p></div>}{customError && <p className="text-sm text-red-600">{customError}</p>}</div>}
          <div className="flex gap-3 items-center"><input type="number" min="0.1" step="0.1" placeholder="Weight in kg" value={quantity} onChange={event => setQuantity(event.target.value)} className="flex-1 p-3 border border-[#E0E7E1] rounded-xl" /><button type="button" disabled={!selectedMaterial || Number(quantity) <= 0 || resolvingCustom} onClick={addMaterial} className="bg-[#2D5A27] text-white font-bold px-5 py-3 rounded-xl disabled:opacity-50">{resolvingCustom ? 'Checking...' : 'Add Material'}</button></div>
        </section>

        <div className="grid md:grid-cols-2 gap-3"><button type="button" disabled={items.length === 0 || items.some(item => !item.estimatedRate)} onClick={() => navigate('/collector/partners')} className="w-full bg-[#1D3124] text-white font-bold py-4 rounded-xl disabled:opacity-50">Sell</button><button type="button" disabled={items.length === 0} onClick={() => navigate('/collector/check-price')} className="w-full border border-[#2D5A27] text-[#2D5A27] font-bold py-4 rounded-xl disabled:opacity-50">Create Lot for Later</button></div>
      </div>
    </div>
  );
}
