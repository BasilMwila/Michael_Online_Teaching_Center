import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
      toast.success('Reset link sent — check your email');
    } catch {
      toast.error('Could not send reset link');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto container-px py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-display font-bold mb-2">Reset password</h1>
        <p className="text-sm text-gray-600 mb-6">Enter your email and we'll send you a reset link.</p>
        {sent ? (
          <div className="text-center py-6">
            <p className="text-5xl mb-3">📬</p>
            <p className="text-gray-700">Check your inbox for a password reset link.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </div>
            <button disabled={busy} className="btn-primary w-full">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="text-sm text-center text-gray-600 mt-5">
          <Link to="/login" className="text-brand-700">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
