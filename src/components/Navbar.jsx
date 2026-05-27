import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

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
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    setMenu(false);
    toast.success('Signed out');
    navigate('/');
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto container-px h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl text-brand-700">
          <span className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center">ES</span>
          <span className="hidden sm:inline">Empire Skills</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {publicLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive ? 'text-brand-700 bg-brand-50' : 'text-gray-700 hover:text-brand-700 hover:bg-gray-50'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {firebaseUser ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">
                  {(profile?.fullName || profile?.email || '?').charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {profile?.fullName?.split(' ')[0] || 'Account'}
                </span>
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 card py-2">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium truncate">{profile?.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{profile?.studentId}</p>
                  </div>
                  <Link to="/dashboard" onClick={() => setMenu(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">Dashboard</Link>
                  <Link to="/bookings" onClick={() => setMenu(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">My Bookings</Link>
                  <Link to="/payments" onClick={() => setMenu(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">My Payments</Link>
                  {isAdmin && <Link to="/admin" onClick={() => setMenu(false)} className="block px-4 py-2 text-sm text-brand-700 hover:bg-brand-50">Admin Console</Link>}
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Log in</Link>
              <Link to="/signup" className="btn-primary text-sm">Get started</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="px-4 py-3 space-y-1">
            {publicLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive ? 'text-brand-700 bg-brand-50' : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="border-t pt-3 mt-3 space-y-1">
              {firebaseUser ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-base hover:bg-gray-50">Dashboard</Link>
                  <Link to="/bookings" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-base hover:bg-gray-50">My Bookings</Link>
                  <Link to="/payments" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-base hover:bg-gray-50">My Payments</Link>
                  {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-base text-brand-700 hover:bg-brand-50">Admin Console</Link>}
                  <button onClick={() => { setOpen(false); handleLogout(); }} className="w-full text-left px-3 py-2 rounded-md text-base text-red-600 hover:bg-red-50">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-base hover:bg-gray-50">Log in</Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-base bg-brand-600 text-white text-center">Get started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
