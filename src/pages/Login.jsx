import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back!');
      navigate(location.state?.from || '/dashboard');
    } catch (e) {
      toast.error(
        e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : 'Could not sign in'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto container-px py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-display font-bold mb-2">Welcome back</h1>
        <p className="text-sm text-gray-600 mb-6">Sign in to continue learning.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          </div>
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-brand-700 hover:underline">Forgot password?</Link>
          </div>
          <button disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-600 mt-5">
          New here? <Link to="/signup" className="text-brand-700 font-semibold">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
