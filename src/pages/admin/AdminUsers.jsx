import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listAllUsers, setUserRole } from '../../lib/users.js';
import { listAllEnrollments } from '../../lib/enrollments.js';
import { formatDateTime } from '../../lib/format.js';
import Icon from '../../components/Icon.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function AdminUsers() {
  const [items, setItems] = useState(null);
  const [byUser, setByUser] = useState({});
  const [search, setSearch] = useState('');

  async function refresh() {
    const [users, enrollments] = await Promise.all([
      listAllUsers(),
      listAllEnrollments().catch(() => [])
    ]);
    // Group enrollments by student so the table can show activity at a glance.
    const map = {};
    for (const e of enrollments) {
      (map[e.userId] ||= []).push(e);
    }
    setByUser(map);
    setItems(users);
  }
  useEffect(() => { refresh(); }, []);

  async function toggleRole(u) {
    const newRole = u.role === 'admin' ? 'student' : 'admin';
    if (!confirm(`Set ${u.email} as ${newRole}?`)) return;
    await setUserRole(u.uid, newRole);
    toast.success('Role updated');
    refresh();
  }

  if (!items) return <Spinner />;
  const filtered = search
    ? items.filter((u) => `${u.email} ${u.fullName} ${u.studentId}`.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Users</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Select a student to see their courses and how far they&rsquo;ve got.
          </p>
        </div>
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-ink-600">
            <tr>
              <th className="px-3 py-3">Student ID</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Courses</th>
              <th className="px-3 py-3 min-w-[150px]">Progress</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Joined</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.map((u) => {
              const enrolled = byUser[u.uid] || [];
              const active = enrolled.filter((e) => e.status === 'active');
              const avg = active.length
                ? Math.round(active.reduce((s, e) => s + (e.progressPercent || 0), 0) / active.length)
                : null;

              return (
                <tr key={u.uid} className="hover:bg-ink-50/60 transition">
                  <td className="px-3 py-3 font-mono text-xs">{u.studentId}</td>
                  <td className="px-3 py-3 font-medium">
                    <Link to={`/admin/users/${u.uid}`} className="hover:text-brand-700">
                      {u.fullName || '—'}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{u.email}</td>
                  <td className="px-3 py-3">
                    {enrolled.length === 0 ? (
                      <span className="text-ink-400">none</span>
                    ) : (
                      <span>
                        {enrolled.length}
                        {active.length !== enrolled.length && (
                          <span className="text-ink-400"> ({active.length} active)</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {avg === null ? (
                      <span className="text-ink-400">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-ink-100 rounded-full h-1.5 overflow-hidden min-w-[60px]">
                          <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${avg}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-ink-700 w-9 text-right">{avg}%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink-600">{formatDateTime(u.createdAt)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <Link to={`/admin/users/${u.uid}`} className="text-brand-700 hover:underline inline-flex items-center gap-1">
                      View<Icon name="arrow-right" size={13} />
                    </Link>
                    <button onClick={() => toggleRole(u)} className="ml-3 text-ink-600 hover:underline">
                      {u.role === 'admin' ? 'Make student' : 'Make admin'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
