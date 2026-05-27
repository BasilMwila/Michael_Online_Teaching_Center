import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { submitPayment } from '../../lib/payments.js';
import { formatMoney } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

export default function PayCourse() {
  const { enrollmentId } = useParams();
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    bankReference: '',
    depositorName: '',
    depositDate: new Date().toISOString().slice(0, 10),
    proofFile: null
  });

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'enrollments', enrollmentId));
      if (snap.exists()) setEnrollment({ id: snap.id, ...snap.data() });
      setLoading(false);
    })();
  }, [enrollmentId]);

  if (loading) return <Spinner />;
  if (!enrollment) return <p className="p-8 text-center">Enrollment not found.</p>;
  if (enrollment.userId !== firebaseUser.uid) return <p className="p-8 text-center">Access denied.</p>;
  if (enrollment.status === 'active') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="text-2xl font-bold mb-2">Payment already confirmed</h2>
        <Link to={`/learn/${enrollment.courseId}`} className="btn-primary">Start learning</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitPayment({
        userId: firebaseUser.uid,
        studentId: profile.studentId,
        courseId: enrollment.courseId,
        courseTitle: enrollment.courseTitle,
        enrollmentId: enrollment.id,
        amountCents: enrollment.priceCents,
        currency: enrollment.currency,
        bankReference: form.bankReference,
        depositorName: form.depositorName,
        depositDate: form.depositDate,
        proofFile: form.proofFile
      });
      toast.success('Payment submitted — admin will confirm shortly');
      navigate('/payments');
    } catch (err) {
      toast.error(err.message || 'Could not submit payment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto container-px py-10">
      <h1 className="text-2xl font-display font-bold mb-1">Complete payment</h1>
      <p className="text-gray-600 mb-6">{enrollment.courseTitle}</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-lg mb-3">Bank transfer details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <dt className="text-gray-500">Amount due</dt>
              <dd className="font-bold text-lg text-brand-700">{formatMoney(enrollment.priceCents, enrollment.currency)}</dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-gray-500">Bank</dt>
              <dd className="font-medium">{import.meta.env.VITE_BANK_NAME || 'Your Bank Name'}</dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-gray-500">Account name</dt>
              <dd className="font-medium">{import.meta.env.VITE_BANK_ACCOUNT_NAME || 'Empire Skills Training Center'}</dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-gray-500">Account number</dt>
              <dd className="font-mono font-medium">{import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '000 000 0000'}</dd>
            </div>
            {import.meta.env.VITE_BANK_SWIFT && (
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">SWIFT</dt>
                <dd className="font-mono">{import.meta.env.VITE_BANK_SWIFT}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Reference</dt>
              <dd className="font-mono font-medium">{profile.studentId}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500 mt-4">
            Use your student ID as the payment reference so we can match your deposit faster.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h3 className="font-semibold text-lg">Submit proof of payment</h3>
          <div>
            <label className="label">Bank reference / transaction ID</label>
            <input
              required
              value={form.bankReference}
              onChange={(e) => setForm((s) => ({ ...s, bankReference: e.target.value }))}
              className="input"
              placeholder="e.g. TX12345678"
            />
          </div>
          <div>
            <label className="label">Depositor name (as on slip)</label>
            <input
              required
              value={form.depositorName}
              onChange={(e) => setForm((s) => ({ ...s, depositorName: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Deposit date</label>
            <input
              type="date"
              required
              value={form.depositDate}
              onChange={(e) => setForm((s) => ({ ...s, depositDate: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Upload proof (image or PDF, max 5MB)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setForm((s) => ({ ...s, proofFile: e.target.files[0] }))}
              className="input file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-brand-100 file:text-brand-700"
            />
          </div>
          <button disabled={busy} className="btn-primary w-full">
            {busy ? 'Submitting…' : 'Submit payment'}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Admin typically confirms within 1 business day.
          </p>
        </form>
      </div>
    </div>
  );
}
