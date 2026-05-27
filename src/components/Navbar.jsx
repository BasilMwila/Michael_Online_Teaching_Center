import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Icon from './Icon.jsx';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' }
];

export default function Navbar() {
  const { firebaseUser, profile, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleLogout() {
    await logout();
    setMenu(false);
    toast.success('Signed out');
    navigate('/');
  }

  return (
    <header className={`sticky top-0 z-30 transition-all duration-300 ${
      scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-white'
    }`}>
      <div className="max-w-7xl mx-auto container-px h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center shadow-soft group-hover:shadow-glow transition-shadow">
              <Icon name="graduation-cap" size={20} className="text-white" strokeWidth={2.2} />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-400" />
          </div>
          <div className="hidden sm:block">
            <p className="font-display font-bold text-ink-900 leading-tight">Empire Skills</p>
            <p className="text-[10px] text-ink-400 leading-tight tracking-wider font-medium uppercase">Training Center</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {publicLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-md text-sm font-medium transition relative ${
                  isActive ? 'text-brand-700' : 'text-ink-600 hover:text-ink-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 bg-gradient-to-r from-brand-500 to-accent-400 rounded-full" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {firebaseUser ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-ink-100 transition"
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-bold text-sm">
                  {(profile?.fullName || profile?.email || '?').charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-ink-800">
                  {profile?.fullName?.split(' ')[0] || 'Account'}
                </span>
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 card py-2 z-20 animate-fade-in">
                    <div className="px-4 py-3 border-b border-ink-100">
                      <p className="text-sm font-semibold truncate text-ink-900">{profile?.fullName}</p>
                      <p className="text-xs text-ink-400 truncate font-mono mt-0.5">{profile?.studentId}</p>
                    </div>
                    <MenuItem to="/dashboard" icon="book-open" onClick={() => setMenu(false)}>Dashboard</MenuItem>
                    <MenuItem to="/bookings" icon="calendar" onClick={() => setMenu(false)}>My Bookings</MenuItem>
                    <MenuItem to="/payments" icon="credit-card" onClick={() => setMenu(false)}>My Payments</MenuItem>
                    {isAdmin && (
                      <>
                        <div className="my-1 border-t border-ink-100" />
                        <MenuItem to="/admin" icon="shield" onClick={() => setMenu(false)} accent>Admin Console</MenuItem>
                      </>
                    )}
                    <div className="my-1 border-t border-ink-100" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      <Icon name="logout" size={16} />Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Log in</Link>
              <Link to="/signup" className="btn-primary text-sm">
                Get started
                <Icon name="arrow-right" size={14} />
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-ink-100 text-ink-700"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <Icon name={open ? 'x' : 'menu'} size={22} />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {publicLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-base font-medium ${
                    isActive ? 'text-brand-700 bg-brand-50' : 'text-ink-700 hover:bg-ink-50'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="border-t border-ink-100 pt-3 mt-3 space-y-1">
              {firebaseUser ? (
                <>
                  <div className="px-3 py-2 mb-2">
                    <p className="text-sm font-semibold">{profile?.fullName}</p>
                    <p className="text-xs text-ink-400 font-mono">{profile?.studentId}</p>
                  </div>
                  <MenuItem to="/dashboard" icon="book-open" onClick={() => setOpen(false)}>Dashboard</MenuItem>
                  <MenuItem to="/bookings" icon="calendar" onClick={() => setOpen(false)}>My Bookings</MenuItem>
                  <MenuItem to="/payments" icon="credit-card" onClick={() => setOpen(false)}>My Payments</MenuItem>
                  {isAdmin && <MenuItem to="/admin" icon="shield" onClick={() => setOpen(false)} accent>Admin Console</MenuItem>}
                  <button onClick={() => { setOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                    <Icon name="logout" size={16} />Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-base hover:bg-ink-50 text-ink-700">Log in</Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary w-full mt-2">
                    Get started
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({ to, icon, children, onClick, accent }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
        accent ? 'text-brand-700 hover:bg-brand-50 font-semibold' : 'text-ink-700 hover:bg-ink-50'
      }`}
    >
      <Icon name={icon} size={16} />
      {children}
    </Link>
  );
}
