import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { listAllUsers, setUserRole } from '../../lib/users.js';
import { formatDateTime } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

export default function AdminUsers() {
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');

  async function refresh() { setItems(await listAllUsers()); }
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
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-display font-bold">Users</h1>
        <input type="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="input max-w-xs" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">Student ID</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Joined</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => (
              <tr key={u.uid}>
                <td className="px-3 py-3 font-mono text-xs">{u.studentId}</td>
                <td className="px-3 py-3 font-medium">{u.fullName}</td>
                <td className="px-3 py-3">{u.email}</td>
                <td className="px-3 py-3 text-gray-600">{u.phone || '—'}</td>
                <td className="px-3 py-3">
                  <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-600">{formatDateTime(u.createdAt)}</td>
                <td className="px-3 py-3 text-right">
                  <button onClick={() => toggleRole(u)} className="text-brand-700 hover:underline">
                    {u.role === 'admin' ? 'Make student' : 'Make admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
