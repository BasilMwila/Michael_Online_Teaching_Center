import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { listMyEnrollments } from '../../lib/enrollments.js';
import { listMyBookings } from '../../lib/bookings.js';
import { formatMoney, formatDateTime, statusBadgeClass } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

export default function Dashboard() {
  const { firebaseUser, profile } = useAuth();
  const [enrollments, setEnrollments] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!firebaseUser) return;
    Promise.all([
      listMyEnrollments(firebaseUser.uid),
      listMyBookings(firebaseUser.uid)
    ]).then(([e, b]) => {
      setEnrollments(e);
      setBookings(b);
    }).catch(() => setEnrollments([]));
  }, [firebaseUser]);

  return (
    <div className="max-w-7xl mx-auto container-px py-10">
      <div className="card p-6 mb-8 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
        <p className="text-brand-100 text-sm">Welcome back,</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">{profile?.fullName}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-brand-100">Student ID: </span>
            <span className="font-bold">{profile?.studentId}</span>
          </div>
          <div>
            <span className="text-brand-100">Email: </span>
            <span className="font-medium">{profile?.email}</span>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold">My courses</h2>
          <Link to="/courses" className="text-brand-700 font-semibold text-sm">Browse more →</Link>
        </div>
        {enrollments === null ? (
          <Spinner />
        ) : enrollments.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't enrolled in any courses yet.</p>
            <Link to="/courses" className="btn-primary">Browse the catalog</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {enrollments.map((e) => (
              <div key={e.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{e.courseTitle}</h3>
                  <span className={`badge ${statusBadgeClass(e.status)}`}>{e.status.replace('_', ' ')}</span>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {formatMoney(e.priceCents, e.currency)} · {e.courseMode === 'live' ? 'Live class' : 'Self-paced'}
                </div>
                {e.status === 'active' && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${e.progressPercent || 0}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{e.progressPercent || 0}% complete</p>
                    <Link to={`/learn/${e.courseId}`} className="btn-primary text-sm w-full">Continue learning</Link>
                  </>
                )}
                {e.status === 'pending_payment' && (
                  <Link to={`/pay/${e.id}`} className="btn-primary text-sm w-full">Complete payment</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold">Upcoming live sessions</h2>
          <Link to="/book-live" className="text-brand-700 font-semibold text-sm">Book new →</Link>
        </div>
        {bookings.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600 mb-4">No live sessions booked.</p>
            <Link to="/book-live" className="btn-primary">Book a live session</Link>
          </div>
        ) : (
          <div className="card divide-y">
            {bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{b.sessionTopic}</p>
                  <p className="text-sm text-gray-500">{formatDateTime(b.sessionStartTime)}</p>
                </div>
                <span className={`badge ${statusBadgeClass(b.status)}`}>{b.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
