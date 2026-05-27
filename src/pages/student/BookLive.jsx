import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { listUpcomingSessions } from '../../lib/liveSessions.js';
import { bookSession } from '../../lib/bookings.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import Empty from '../../components/Empty.jsx';

export default function BookLive() {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(null);
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listUpcomingSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const categories = useMemo(() => {
    if (!sessions) return [];
    return Array.from(new Set(sessions.map((s) => s.category).filter(Boolean)));
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      if (type !== 'all' && s.type !== type) return false;
      if (category !== 'all' && s.category !== category) return false;
      return s.status === 'open';
    });
  }, [sessions, type, category]);

  async function handleBook() {
    if (!selected) return;
    setBusy(true);
    try {
      await bookSession({
        userId: firebaseUser.uid,
        studentId: profile.studentId,
        fullName: profile.fullName,
        session: selected,
        topicCategory: selected.category,
        notes
      });
      toast.success(selected.priceCents > 0
        ? 'Booked — complete payment from My Bookings'
        : 'Booked successfully!'
      );
      setSelected(null);
      setNotes('');
      navigate('/bookings');
    } catch (e) {
      toast.error(e.message || 'Could not book session');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Book a live session" subtitle="Pick a topic and a time that works for you. Confirmation link comes via email." />
      <div className="max-w-7xl mx-auto container-px py-8">
        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="input md:w-56">
            <option value="all">All session types</option>
            <option value="one_on_one">1-on-1</option>
            <option value="group_class">Group class</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input md:w-56">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {sessions === null ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty title="No open sessions" message="Check back soon — new live slots are added every week." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`card p-5 text-left hover:shadow-md transition ${selected?.id === s.id ? 'ring-2 ring-brand-500' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge bg-brand-100 text-brand-700">{s.type === 'one_on_one' ? '1-on-1' : 'Group'}</span>
                  {s.category && <span className="badge bg-gray-100 text-gray-700">{s.category}</span>}
                </div>
                <h3 className="font-semibold text-lg mb-1">{s.topic}</h3>
                <p className="text-sm text-gray-500 mb-3">{formatDateTime(s.startTime)}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-brand-700">
                    {s.priceCents > 0 ? formatMoney(s.priceCents, s.currency || 'USD') : 'Free'}
                  </span>
                  {s.capacity && (
                    <span className="text-gray-500">{s.bookedCount || 0} / {s.capacity} booked</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40" onClick={() => setSelected(null)}>
            <div className="card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-display font-bold mb-1">Confirm booking</h3>
              <p className="text-sm text-gray-500 mb-4">{selected.topic} · {formatDateTime(selected.startTime)}</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Student</span><span className="font-medium">{profile?.fullName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Student ID</span><span className="font-mono">{profile?.studentId}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{selected.type === 'one_on_one' ? '1-on-1' : 'Group class'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold">{selected.priceCents > 0 ? formatMoney(selected.priceCents, selected.currency) : 'Free'}</span></div>
              </div>
              <div className="mt-4">
                <label className="label">Anything you'd like to focus on?</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" placeholder="Optional notes for the instructor"></textarea>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleBook} disabled={busy} className="btn-primary flex-1">
                  {busy ? 'Booking…' : 'Confirm booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
