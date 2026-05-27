import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { listMyBookings, cancelBooking } from '../../lib/bookings.js';
import { formatMoney, formatDateTime, statusBadgeClass } from '../../lib/format.js';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import Empty from '../../components/Empty.jsx';

export default function MyBookings() {
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState(null);

  async function refresh() {
    if (!firebaseUser) return;
    const list = await listMyBookings(firebaseUser.uid);
    setItems(list);
  }

  useEffect(() => { refresh(); }, [firebaseUser]);

  async function handleCancel(b) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(b);
      toast.success('Booking cancelled');
      refresh();
    } catch {
      toast.error('Could not cancel');
    }
  }

  return (
    <div>
      <PageHeader title="My bookings" subtitle="All your live sessions in one place.">
        <Link to="/book-live" className="btn bg-white text-brand-700 hover:bg-brand-50">Book another →</Link>
      </PageHeader>
      <div className="max-w-5xl mx-auto container-px py-8">
        {items === null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty title="No bookings yet" message="Browse upcoming live sessions and reserve your spot." action={<Link to="/book-live" className="btn-primary">Book a session</Link>} />
        ) : (
          <div className="space-y-4">
            {items.map((b) => (
              <div key={b.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.sessionTopic}</p>
                  <p className="text-sm text-gray-500">{formatDateTime(b.sessionStartTime)} · {b.sessionType === 'one_on_one' ? '1-on-1' : 'Group'}</p>
                  {b.notes && <p className="text-xs text-gray-500 mt-1 italic">"{b.notes}"</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${statusBadgeClass(b.status)}`}>{b.status.replace('_', ' ')}</span>
                  {b.priceCents > 0 && <span className="text-sm font-medium">{formatMoney(b.priceCents, b.currency)}</span>}
                  {(b.status === 'confirmed' || b.status === 'pending_payment') && (
                    <button onClick={() => handleCancel(b)} className="text-sm text-red-600 hover:underline">Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
