import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    subscribe: true
  });
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((s) => ({ ...s, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      const { studentId } = await signup({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        subscribeUpdates: form.subscribe
      });
      toast.success(`Welcome! Your student ID is ${studentId}`, { duration: 6000 });
      const dest = location.state?.from || '/dashboard';
      navigate(dest);
    } catch (e) {
      toast.error(e.code === 'auth/email-already-in-use' ? 'Email already registered' : 'Could not sign up');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto container-px py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-display font-bold mb-2">Create your account</h1>
        <p className="text-sm text-gray-600 mb-6">Get your unique student ID and start learning today.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className="input" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className="input" placeholder="you@email.com" />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input" placeholder="+254 700 000 000" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} className="input" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input type="password" required minLength={6} value={form.confirm} onChange={(e) => update('confirm', e.target.value)} className="input" />
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.subscribe}
              onChange={(e) => update('subscribe', e.target.checked)}
              className="mt-1 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
            />
            Send me course updates and free learning tips by email.
          </label>
          <button disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating account…' : 'Create my account'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-600 mt-5">
          Already have an account? <Link to="/login" className="text-brand-700 font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
