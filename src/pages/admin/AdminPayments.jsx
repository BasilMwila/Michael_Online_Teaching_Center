import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { listAllPayments, confirmPayment, rejectPayment } from '../../lib/payments.js';
import { formatMoney, formatDateTime, statusBadgeClass } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

export default function AdminPayments() {
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('pending');

  async function refresh() {
    setItems(await listAllPayments());
  }

  useEffect(() => { refresh(); }, []);

  async function approve(p) {
    if (!confirm(`Approve payment of ${formatMoney(p.amountCents, p.currency)} for ${p.studentId}?`)) return;
    try {
      await confirmPayment(p, firebaseUser.uid);
      toast.success('Payment approved & enrollment activated');
      refresh();
    } catch {
      toast.error('Could not approve');
    }
  }

  async function reject(p) {
    const reason = prompt('Reason for rejecting? (shown to student)');
    if (reason === null) return;
    try {
      await rejectPayment(p.id, firebaseUser.uid, reason);
      toast.success('Payment rejected');
      refresh();
    } catch {
      toast.error('Could not reject');
    }
  }

  if (!items) return <Spinner />;
  const filtered = items.filter((p) => filter === 'all' ? true : p.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Payments</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-40">
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No payments in this view.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-3">Submitted</th>
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Course</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Reference</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Proof</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600">{formatDateTime(p.submittedAt)}</td>
                  <td className="px-3 py-3">
                    <p className="font-mono text-xs">{p.studentId}</p>
                    <p className="text-xs text-gray-500">{p.depositorName}</p>
                  </td>
                  <td className="px-3 py-3">{p.courseTitle}</td>
                  <td className="px-3 py-3 font-medium">{formatMoney(p.amountCents, p.currency)}</td>
                  <td className="px-3 py-3 font-mono text-xs">{p.bankReference}</td>
                  <td className="px-3 py-3"><span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                  <td className="px-3 py-3">
                    {p.proofUrl ? <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">View</a> : '—'}
                  </td>
                  <td className="px-3 py-3 text-right space-x-2 whitespace-nowrap">
                    {p.status === 'pending' && (
                      <>
                        <button onClick={() => approve(p)} className="text-emerald-700 hover:underline">Approve</button>
                        <button onClick={() => reject(p)} className="text-red-600 hover:underline">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
