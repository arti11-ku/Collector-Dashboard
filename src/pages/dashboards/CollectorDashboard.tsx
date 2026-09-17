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
  Award,
  Star,
  X
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
  const [completionLot, setCompletionLot] = useState<any>(null);
  const [completionStep, setCompletionStep] = useState<'handover' | 'payment'>('handover');
  const [completionMessage, setCompletionMessage] = useState('');
  const [reviewRatings, setReviewRatings] = useState([0, 0, 0]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  
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
        setActiveLots((lotsData.lots || []).filter((lot: any) => !['COMPLETED', 'SUCCESSFUL_COMPLETED', 'CANCELLED', 'RECYCLING_COMPLETED'].includes(lot.status)));
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

  const completeProcess = async (handoverAnswer?: boolean, paymentAnswer?: boolean) => {
    if (!completionLot) return;
    const handoverConfirmed = typeof handoverAnswer === 'boolean' ? handoverAnswer : completionLot.handoverConfirmed === true;
    const paymentReceived = typeof paymentAnswer === 'boolean' ? paymentAnswer : completionLot.paymentReceived === true;
    setCompletionMessage('');
    try {
      const response = await fetch(`/api/collector/lots/${completionLot.lotId}/complete-process`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handoverConfirmed, paymentReceived }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Completion could not be updated.');
      setCompletionLot(data.lot);
      if (data.completed) setCompletionStep('payment');
      else setCompletionMessage(paymentReceived ? 'Your lot has not been marked as completed yet.' : handoverConfirmed ? 'Your lot will remain pending until payment is confirmed.' : 'Your lot is still pending handover.');
    } catch (error: any) { setCompletionMessage(error.message || 'Completion could not be updated.'); }
  };

  const submitReview = async () => {
    if (!completionLot || reviewRatings.some(rating => rating < 1 || rating > 5)) return;
    setReviewSubmitting(true); setCompletionMessage('');
    try {
      const response = await fetch(`/api/collector/lots/${completionLot.lotId}/review`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question1Rating: reviewRatings[0], question2Rating: reviewRatings[1], question3Rating: reviewRatings[2] }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Review could not be submitted.');
      setActiveLots(current => current.filter(lot => lot.id !== completionLot.id));
      setCompletionLot(null); setReviewRatings([0, 0, 0]); setCompletionStep('handover');
    } catch (error: any) { setCompletionMessage(error.message || 'Review could not be submitted.'); } finally { setReviewSubmitting(false); }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-[28px] border border-[#DDEFE1] bg-[linear-gradient(135deg,_rgba(248,253,249,0.96),_rgba(229,245,235,0.96))] p-6 shadow-[0_18px_40px_rgba(17,53,31,0.06)] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#B9E4C5] rounded-full blur-3xl opacity-55"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#9ED0AB] rounded-full blur-3xl opacity-35"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,107,69,0.08),_transparent_28%)]"></div>

        <div className="relative z-10">
          <p className="text-xs font-bold text-[#5A7A54] tracking-[0.18em] uppercase mb-2">{greeting}</p>
          <h2 className="text-3xl font-bold text-[#1D3124] mb-2 tracking-tight">{t('Namaste') + ', ' + (user?.name?.split(' ')[0] || 'Collector')}</h2>
          <p className="text-[#5A7A54] text-sm max-w-md">{t('mission_statement')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Active Pickups'), value: stats?.activePickups ?? '-', color: 'bg-[#EAF7F0] text-[#0F6B45]' },
          { label: t('Active Lots'), value: stats?.activeLots ?? '-', color: 'bg-[#EEF4FF] text-[#3C5C9B]' },
          { label: t('Pending Handovers'), value: stats?.pendingHandovers ?? '-', color: 'bg-[#FFF6E8] text-[#A15D14]' },
          { label: t('Total Earnings'), value: stats?.earnings ? `₹${stats.earnings}` : '₹0', color: 'bg-[#E8F3EA] text-[#2D5A27]' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl border border-[#DDEFE1] bg-[#F4FBF7] p-4 shadow-[0_10px_24px_rgba(17,53,31,0.04)] flex flex-col justify-center">
            <p className="text-[11px] font-bold text-[#5A7A54] uppercase tracking-wider mb-2">{stat.label}</p>
            <div className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {activeLots.length > 0 && <div className="rounded-[28px] border border-[#DDEFE1] bg-[#F4FBF7] p-6 shadow-[0_14px_30px_rgba(17,53,31,0.05)]"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-[#1D3124]">YOUR ACTIVE LOTS ({activeLots.length}/5)</h3><Link to="/collector/lots" className="text-sm font-bold text-[#2D5A27]">View All Lots</Link></div><div className="grid md:grid-cols-2 gap-3">{activeLots.map(lot => <Link key={lot.id} to={`/collector/lots/${lot.lotId}`} className="border border-[#DDEFE1] rounded-xl p-4 bg-white/80 hover:bg-white transition-colors"><div className="flex justify-between"><b>{lot.lotId}</b><span className="text-xs font-bold text-orange-700">{lot.status.replace(/_/g, ' ')}</span></div><p className="text-sm mt-2">{(lot.items || []).map((item: any) => `${item.materialName || item.materialId} - ${item.declaredWeight} kg`).join(', ')}</p><p className="text-xs text-[#5A7A54] mt-1">{lot.pickup ? `Pickup ${lot.pickup.preferredDate}` : 'Pickup not booked yet'}</p>{lot.handoverOtp && lot.pickup && !['COMPLETED', 'SUCCESSFUL_COMPLETED', 'CANCELLED'].includes(lot.status) && <><p className="text-sm font-bold text-[#0F6B45] mt-3">Handover OTP: <span className="font-mono tracking-widest">{lot.handoverOtp}</span></p><button type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); setCompletionLot({ ...lot }); setCompletionStep('handover'); setCompletionMessage(''); }} className="mt-3 w-full rounded-xl bg-[#0F6B45] px-3 py-2 text-sm font-bold text-white">Complete Process</button></>}</Link>)}</div></div>}

      {completionLot && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-3xl bg-[#F4FBF7] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#2E8B65]">Lot {completionLot.lotId}</p><h3 className="mt-1 text-2xl font-bold text-[#183127]">{completionLot.processCompleted ? 'Process Completed' : 'Complete Process'}</h3></div><button type="button" onClick={() => setCompletionLot(null)} aria-label="Close"><X className="h-5 w-5" /></button></div>{completionLot.processCompleted ? <div className="mt-5 space-y-4"><p className="text-sm text-[#61766C]">Handover and payment are confirmed for {completionLot.partnerName || 'your selected partner'}.</p><p className="font-bold text-[#0F6B45]">Final amount received: ₹{Number(completionLot.agreedAmount || completionLot.partnerOffer?.finalNetPayout || 0).toLocaleString()}</p><div className="border-t border-[#DDEFE1] pt-4"><h4 className="font-bold text-lg text-[#183127]">Rate Your Experience</h4>{['How professional was the pickup and handover experience?', 'How fair and satisfactory was the payment process?', 'How smooth and reliable was the overall transaction?'].map((question, index) => <div key={question} className="mt-4"><p className="text-sm font-semibold text-[#183127]">{question}</p><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map(star => <button type="button" key={star} onClick={() => setReviewRatings(current => current.map((value, ratingIndex) => ratingIndex === index ? star : value))} aria-label={`${star} stars`}><Star className={`h-7 w-7 ${reviewRatings[index] >= star ? 'fill-[#E7A3A3] text-[#C77B7B]' : 'text-[#9AB8A8]'}`} /></button>)}</div></div>)}<button type="button" onClick={submitReview} disabled={reviewSubmitting || reviewRatings.some(rating => rating < 1)} className="mt-5 w-full rounded-xl bg-[#0F6B45] px-4 py-3 font-bold text-white disabled:opacity-50">{reviewSubmitting ? 'Submitting...' : 'Submit Review'}</button></div></div> : <div className="mt-5 space-y-5"><label className="block text-sm font-semibold text-[#183127]">Has the e-waste been handed over successfully?<select value={completionLot.handoverConfirmed ? 'YES' : 'NO'} onChange={event => setCompletionLot((current: any) => ({ ...current, handoverConfirmed: event.target.value === 'YES' }))} className="mt-2 w-full rounded-xl border border-[#DDEFE1] bg-white p-3"><option value="NO">No</option><option value="YES">Yes</option></select></label><label className="block text-sm font-semibold text-[#183127]">Have you received your payment?<select value={completionLot.paymentReceived ? 'YES' : 'NO'} onChange={event => setCompletionLot((current: any) => ({ ...current, paymentReceived: event.target.value === 'YES' }))} className="mt-2 w-full rounded-xl border border-[#DDEFE1] bg-white p-3"><option value="NO">No</option><option value="YES">Yes</option></select></label><button type="button" onClick={completeProcess} className="w-full rounded-xl bg-[#0F6B45] px-4 py-3 font-bold text-white">Confirm</button></div>}{completionMessage && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{completionMessage}</p>}</div></div>}

      <div className="rounded-[28px] bg-[linear-gradient(135deg,_#0F6B45_0%,_#183E2C_100%)] p-6 md:p-8 text-white shadow-[0_24px_48px_rgba(15,107,69,0.22)] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white opacity-5 rounded-full -translate-y-1/4 translate-x-1/4 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div className="mb-6 md:mb-0">
            <p className="text-xs font-bold text-[#BFE7CF] uppercase tracking-wider mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" /> {t('RECYSETU Contribution')}
            </p>
            <div className="flex items-baseline mb-2">
              <h3 className="text-5xl font-bold">{displayScore}</h3>
              {typeof displayScore === "number" && <span className="text-2xl text-[#BFE7CF] ml-1">/ 100</span>}
            </div>
            <p className="text-lg text-white font-medium mb-1">
              {typeof displayScore === "number" && displayScore > 60 ? "Reliable Contributor" : "Active Contributor"}
            </p>
            <p className="text-[#BFE7CF] text-sm flex items-center">
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

      <h3 className="text-sm font-bold text-[#1D3124] uppercase tracking-widest pt-2">{t('Quick Actions')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { to: '/collector/material', icon: PackagePlus, label: t('Add Material'), color: 'bg-[#EAF7F0] text-[#0F6B45]' },
          { to: '/collector/check-price', icon: Tag, label: t('Check Price'), color: 'bg-[#EAF2FF] text-[#3357B0]' },
          { to: '/collector/lots', icon: ShieldCheck, label: t('My Lots'), color: 'bg-[#F0F3FF] text-[#4B5AB0]' },
          { to: '/collector/pickup', icon: Truck, label: t('Track Pickup'), color: 'bg-[#EAF9F7] text-[#1A7F7E]' },
          { to: '/collector/earnings', icon: Wallet, label: t('My Earnings'), color: 'bg-[#EAF7F0] text-[#0F6B45]' },
          { to: '/collector/assistant', icon: Bot, label: t('Assistant'), color: 'bg-[#F5ECFF] text-[#7148AE]' },
        ].map((action, i) => (
          <Link
            key={i}
            to={action.to}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border border-[#DDEFE1] bg-[#F4FBF7] hover:shadow-[0_12px_24px_rgba(17,53,31,0.06)] transition-all active:scale-95 group"
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
