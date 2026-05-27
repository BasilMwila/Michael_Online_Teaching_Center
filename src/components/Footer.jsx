import { Link } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { subscribeToNewsletter } from '../lib/users.js';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await subscribeToNewsletter(email.trim());
      setEmail('');
      toast.success("Subscribed — we'll keep you posted!");
    } catch {
      toast.error('Could not subscribe. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto container-px py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">ES</span>
            <span className="text-white font-display font-bold text-xl">Empire Skills</span>
          </div>
          <p className="text-sm text-gray-400 max-w-md">
            Master in-demand skills with expert-led, self-paced video courses and live coaching.
            Unique student IDs · WhatsApp class groups · video and written testimonials from real graduates.
          </p>
          <form onSubmit={handleSubscribe} className="mt-5 flex gap-2 max-w-md">
            <input
              type="email"
              required
              placeholder="Your email for course updates"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
            />
            <button disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? '...' : 'Subscribe'}
            </button>
          </form>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/courses" className="hover:text-white">Courses</Link></li>
            <li><Link to="/testimonials" className="hover:text-white">Testimonials</Link></li>
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/signup" className="hover:text-white">Create account</Link></li>
            <li><Link to="/login" className="hover:text-white">Log in</Link></li>
            <li><Link to="/dashboard" className="hover:text-white">My dashboard</Link></li>
            <li><Link to="/book-live" className="hover:text-white">Book live session</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto container-px text-xs text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} Empire Skills Training Center. All rights reserved.</p>
          <p>Support: {import.meta.env.VITE_SUPPORT_EMAIL || 'support@empireskills.example'}</p>
        </div>
      </div>
    </footer>
  );
}
