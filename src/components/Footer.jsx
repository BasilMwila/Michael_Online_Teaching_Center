import { Link } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { subscribeToNewsletter } from '../lib/users.js';
import Icon from './Icon.jsx';

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

  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@empireskills.example';
  const supportWA = import.meta.env.VITE_SUPPORT_WHATSAPP || '+000 000 0000';

  return (
    <footer className="mt-20">
      {/* Letterhead angled bars: short navy + long gold */}
      <div className="flex items-stretch gap-2 h-2.5 mb-1.5" aria-hidden="true">
        <div className="w-[16%] min-w-[90px] bg-brand-900" style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }} />
        <div className="flex-1 bg-accent-500" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%)' }} />
      </div>
      <div className="bg-brand-950 text-ink-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh-dark opacity-50" />
      <div className="relative max-w-7xl mx-auto container-px py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white rounded-lg p-1.5">
              <img src="/logo-light.png" alt="ESA logo" className="h-11 w-auto" />
            </div>
            <div>
              <p className="font-display font-bold text-white text-lg leading-tight">Empire Skills</p>
              <p className="text-[10px] text-accent-400 tracking-wider font-semibold uppercase">Never Stop Growing</p>
            </div>
          </div>
          <p className="text-sm text-ink-400 max-w-md leading-relaxed">
            Master in-demand skills with expert-led, self-paced video courses and live coaching.
            Unique student IDs, WhatsApp class groups, and certificates from real instructors.
          </p>
          <form onSubmit={handleSubscribe} className="mt-6 flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Icon name="mail" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="email"
                required
                placeholder="Your email for course updates"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-ink-400 focus:outline-none focus:border-brand-400 focus:bg-white/10 transition text-sm"
              />
            </div>
            <button disabled={busy} className="btn-accent disabled:opacity-50">
              {busy ? '...' : 'Subscribe'}
            </button>
          </form>
        </div>

        <div>
          <h4 className="text-white font-display font-semibold mb-4 text-sm uppercase tracking-wider">Explore</h4>
          <ul className="space-y-3 text-sm">
            <FooterLink to="/services">Services</FooterLink>
            <FooterLink to="/courses">Courses</FooterLink>
            <FooterLink to="/testimonials">Testimonials</FooterLink>
            <FooterLink to="/about">About</FooterLink>
            <FooterLink to="/contact">Contact</FooterLink>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-display font-semibold mb-4 text-sm uppercase tracking-wider">Get in touch</h4>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 hover:text-white transition">
                <Icon name="mail" size={14} /><span className="truncate">{supportEmail}</span>
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${supportWA.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 hover:text-white transition"
              >
                <Icon name="whatsapp" size={14} />{supportWA}
              </a>
            </li>
            <li className="flex items-center gap-2 text-ink-400">
              <Icon name="clock" size={14} />Mon – Fri · 9am – 6pm
            </li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto container-px text-xs text-ink-400 flex flex-col sm:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} Empire Skills Training Center. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
            All systems operational
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="hover:text-white transition inline-flex items-center gap-1.5 group">
        <span>{children}</span>
        <Icon name="arrow-right" size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
      </Link>
    </li>
  );
}
