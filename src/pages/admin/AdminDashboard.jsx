import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAllCourses } from '../../lib/courses.js';
import { listAllUsers } from '../../lib/users.js';
import { listAllPayments, listPendingPayments } from '../../lib/payments.js';
import { listAllSessions } from '../../lib/liveSessions.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      listAllCourses(),
      listAllUsers(),
      listAllPayments(),
      listPendingPayments(),
      listAllSessions()
    ]).then(([courses, users, payments, pending, sessions]) => {
      const revenueCents = payments
        .filter((p) => p.status === 'confirmed')
        .reduce((sum, p) => sum + (p.amountCents || 0), 0);
      setStats({
        courses: courses.length,
        publishedCourses: courses.filter((c) => c.isPublished).length,
        users: users.length,
        students: users.filter((u) => u.role === 'student').length,
        admins: users.filter((u) => u.role === 'admin').length,
        pendingPayments: pending.length,
        confirmedPayments: payments.filter((p) => p.status === 'confirmed').length,
        revenueCents,
        sessions: sessions.length,
        upcomingSessions: sessions.filter((s) => s.startTime?.toDate?.() > new Date() && s.status !== 'cancelled').length,
        recentPayments: payments.slice(0, 5)
      });
    });
  }, []);

  if (!stats) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total revenue" value={formatMoney(stats.revenueCents, 'USD')} accent />
        <StatCard label="Pending payments" value={stats.pendingPayments} link="/admin/payments" />
        <StatCard label="Students" value={stats.students} link="/admin/users" />
        <StatCard label="Published courses" value={`${stats.publishedCourses} / ${stats.courses}`} link="/admin/courses" />
        <StatCard label="Upcoming sessions" value={stats.upcomingSessions} link="/admin/live-sessions" />
        <StatCard label="All-time payments" value={stats.confirmedPayments} />
        <StatCard label="Admins" value={stats.admins} />
        <StatCard label="Total live sessions" value={stats.sessions} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Recent payments</h2>
        {stats.recentPayments.length === 0 ? (
          <p className="text-gray-500">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr><th>Date</th><th>Student</th><th>Course</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y">
              {stats.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{formatDateTime(p.submittedAt)}</td>
                  <td>{p.studentId}</td>
                  <td>{p.courseTitle}</td>
                  <td>{formatMoney(p.amountCents, p.currency)}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, link, accent }) {
  const content = (
    <div className={`card p-5 ${accent ? 'bg-brand-600 text-white' : ''}`}>
      <p className={`text-xs uppercase tracking-wide mb-1 ${accent ? 'text-brand-100' : 'text-gray-500'}`}>{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
  return link ? <Link to={link} className="block hover:opacity-90">{content}</Link> : content;
}
