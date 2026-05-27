import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { listMyPayments } from '../../lib/payments.js';
import { formatMoney, formatDateTime, statusBadgeClass } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';
import Empty from '../../components/Empty.jsx';
import PageHeader from '../../components/PageHeader.jsx';

export default function MyPayments() {
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!firebaseUser) return;
    listMyPayments(firebaseUser.uid).then(setItems).catch(() => setItems([]));
  }, [firebaseUser]);

  return (
    <div>
      <PageHeader title="My payments" subtitle="History of every payment you've submitted." />
      <div className="max-w-5xl mx-auto container-px py-8">
        {items === null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty title="No payments yet" message="When you enroll in a course your payment record will appear here." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(p.submittedAt)}</td>
                    <td className="px-4 py-3 font-medium">{p.courseTitle}</td>
                    <td className="px-4 py-3">{formatMoney(p.amountCents, p.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.bankReference}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3">
                      {p.proofUrl ? (
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">View</a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
