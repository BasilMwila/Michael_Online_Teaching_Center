import { NavLink, Outlet } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';

const links = [
  { to: '/admin', label: 'Overview', icon: 'chart-bar', end: true },
  { to: '/admin/courses', label: 'Courses', icon: 'book-open' },
  { to: '/admin/payments', label: 'Payments', icon: 'credit-card' },
  { to: '/admin/live-sessions', label: 'Live sessions', icon: 'video' },
  { to: '/admin/users', label: 'Users', icon: 'users' },
  { to: '/admin/testimonials', label: 'Testimonials', icon: 'star' },
  { to: '/admin/whatsapp', label: 'WhatsApp groups', icon: 'whatsapp' }
];

export default function AdminLayout() {
  return (
    <div className="max-w-7xl mx-auto container-px py-6 grid lg:grid-cols-[220px_1fr] gap-6">
      <aside className="card p-3 h-fit lg:sticky lg:top-20">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 pb-2">Admin console</p>
        <nav className="space-y-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                  isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <Icon name={l.icon} size={16} />{l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
