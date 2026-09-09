import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

const MIN_LENGTH = 8;

export default function ChangePassword() {
  const { changePassword, mustChangePassword, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const forced = mustChangePassword;
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    if (form.next.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters.`;
    if (form.next !== form.confirm) return 'The two new passwords do not match.';
    if (form.next === form.current) return 'Choose a password different from your current one.';
    if (!/[A-Za-z]/.test(form.next) || !/[0-9]/.test(form.next)) {
      return 'Include at least one letter and one number.';
    }
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }

    setBusy(true);
    setError('');
    try {
      await changePassword(form.current, form.next);
      toast.success('Password updated');
      navigate(location.state?.from || (isAdmin ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      const code = err?.code || '';
      setError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'That current password is not right.'
          : code === 'auth/weak-password'
            ? 'Firebase rejected that password as too weak.'
            : code === 'auth/too-many-requests'
              ? 'Too many attempts. Wait a few minutes and try again.'
              : err.message || 'Could not change the password.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto container-px py-16">
      <div className="card p-8">
        <div className="icon-tile w-14 h-14 bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 mb-5">
          <Icon name="lock" size={24} />
        </div>

        <h1 className="text-2xl font-display font-bold text-ink-900">
          {forced ? 'Set your own password' : 'Change password'}
        </h1>
        <p className="mt-2 text-sm text-ink-600 leading-relaxed">
          {forced
            ? `This account was set up for you with a temporary password. Choose your own before continuing.`
            : 'Pick a new password for your account.'}
        </p>
        {profile?.email && (
          <p className="mt-1 text-sm text-ink-500 font-medium">{profile.email}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">{forced ? 'Temporary password' : 'Current password'}</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={form.current}
              onChange={(e) => update('current', e.target.value)}
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              className="input"
              value={form.next}
              onChange={(e) => update('next', e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-500">
              At least {MIN_LENGTH} characters, including a letter and a number.
            </p>
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              className="input"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            <Icon name="check" size={16} />
            {busy ? 'Saving…' : forced ? 'Set password and continue' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
