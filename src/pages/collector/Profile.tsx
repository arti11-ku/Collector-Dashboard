import React, { useEffect, useState } from 'react';
import { Bell, Check, MapPin, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { locationLabel } from '../../services/location';

export function Profile() {
  const { user, refreshSession } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [name, setName] = useState(user?.name || '');
  const [upiId, setUpiId] = useState('');
  const [message, setMessage] = useState('');

  const loadNotifications = async () => {
    const response = await fetch('/api/collector/notifications', { credentials: 'include' });
    const data = await response.json();
    if (response.ok) { setNotifications(data.notifications || []); setUnreadCount(data.unreadCount || 0); }
  };

  useEffect(() => { loadNotifications(); }, []);

  const saveProfile = async () => {
    const response = await fetch('/api/collector/profile', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, upiId }) });
    const data = await response.json();
    setMessage(response.ok ? 'Profile updated.' : data.error || 'Profile update failed.');
    if (response.ok) refreshSession();
  };

  const markRead = async (id: string) => {
    await fetch(`/api/collector/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
    loadNotifications();
  };

  const location = user?.location;
  return <div className="space-y-6 pb-6">
    <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-[#E8F3EA] text-[#2D5A27] flex items-center justify-center"><UserIcon /></div><div><h2 className="text-2xl font-bold text-[#1D3124]">Profile</h2><p className="text-sm text-[#5A7A54]">Your saved Collector information</p></div></div>
    <section className="bg-white border border-[#E0E7E1] rounded-3xl p-6 shadow-sm space-y-4"><h3 className="font-bold text-lg">Account</h3><div className="grid md:grid-cols-2 gap-4"><label className="text-sm font-semibold">Name<input value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full p-3 border rounded-xl font-normal" /></label><div className="text-sm font-semibold">Mobile<p className="mt-1 p-3 rounded-xl bg-[#F9FBFA] font-normal">{user?.mobile || 'Not available'}</p></div><div className="text-sm font-semibold">Role<p className="mt-1 p-3 rounded-xl bg-[#F9FBFA] font-normal">Collector</p></div><label className="text-sm font-semibold">UPI identifier<input value={upiId} onChange={event => setUpiId(event.target.value)} placeholder="Optional" className="mt-1 w-full p-3 border rounded-xl font-normal" /></label></div><button onClick={saveProfile} className="bg-[#2D5A27] text-white px-5 py-3 rounded-xl font-bold">Save profile</button>{message && <p className="text-sm text-[#2D5A27]">{message}</p>}</section>
    <section className="bg-white border border-[#E0E7E1] rounded-3xl p-6 shadow-sm"><h3 className="font-bold text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-[#2D5A27]" /> Saved location</h3>{location ? <div className="mt-3 bg-[#E8F3EA] rounded-xl p-4 text-sm"><p className="font-bold text-[#2D5A27]">{locationLabel(location)}</p><p>{location.formattedAddress}</p><p className="mt-2">{[location.locality, location.landmark, location.ward, location.district, location.pincode, location.country].filter(Boolean).join(' · ')}</p></div> : <p className="mt-3 text-sm text-[#5A7A54]">No resolved location saved yet.</p>}</section>
    <section className="bg-white border border-[#E0E7E1] rounded-3xl p-6 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-[#2D5A27]" /> Notifications</h3>{unreadCount > 0 && <span className="rounded-full bg-red-100 text-red-700 px-2 py-1 text-xs font-bold">{unreadCount} unread</span>}</div>{notifications.length === 0 ? <p className="mt-4 text-sm text-[#5A7A54]">No notifications yet. Lot and quotation activity will appear here.</p> : <div className="mt-4 space-y-3">{notifications.map(notification => <div key={notification.id} className={`rounded-xl border p-4 ${notification.isRead ? 'border-[#E0E7E1]' : 'border-[#A5D6A7] bg-[#F4FAF4]'}`}><div className="flex justify-between gap-3"><div><p className="font-bold text-sm">{notification.title}</p><p className="text-sm mt-1">{notification.message}</p><p className="text-xs text-[#5A7A54] mt-2">{new Date(notification.createdAt).toLocaleString()}</p></div>{!notification.isRead && <button onClick={() => markRead(notification.id)} aria-label="Mark notification as read" className="shrink-0 text-[#2D5A27]"><Check className="w-5 h-5" /></button>}</div></div>)}</div>}</section>
    <section className="bg-white border border-[#E0E7E1] rounded-3xl p-6 shadow-sm"><h3 className="font-bold text-lg">Contribution</h3><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><p className="rounded-xl bg-[#F9FBFA] p-3">Points<br /><b>{user?.points || 0}</b></p><p className="rounded-xl bg-[#F9FBFA] p-3">Score<br /><b>{user?.contributionScore || 'Building'}</b></p></div></section>
  </div>;
}
