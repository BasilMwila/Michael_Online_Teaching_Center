import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  listAllSessions, createSession, updateSession, deleteSession
} from '../../lib/liveSessions.js';
import { formatDateTime, formatMoney, statusBadgeClass } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

const defaultForm = {
  type: 'one_on_one',
  topic: '',
  category: '',
  startTime: '',
  endTime: '',
  capacity: 1,
  priceCents: 0,
  currency: 'USD',
  meetingUrl: '',
  whatsappGroupUrl: '',
  status: 'open'
};

export default function AdminLiveSessions() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);

  async function refresh() { setItems(await listAllSessions()); }
  useEffect(() => { refresh(); }, []);

  async function handleSave(form, id) {
    const payload = {
      type: form.type,
      topic: form.topic,
      category: form.category,
      startTime: form.startTime ? Timestamp.fromDate(new Date(form.startTime)) : null,
      endTime: form.endTime ? Timestamp.fromDate(new Date(form.endTime)) : null,
      capacity: Number(form.capacity) || null,
      priceCents: Math.round(Number(form.priceCents) * 100) || 0,
      currency: form.currency,
      meetingUrl: form.meetingUrl,
      whatsappGroupUrl: form.whatsappGroupUrl,
      status: form.status
    };
    if (id) {
      await updateSession(id, payload);
      toast.success('Session updated');
    } else {
      await createSession(payload);
      toast.success('Session created');
    }
    setEditing(null);
    refresh();
  }

  async function handleDelete(s) {
    if (!confirm(`Delete session "${s.topic}"?`)) return;
    await deleteSession(s.id);
    toast.success('Deleted');
    refresh();
  }

  if (!items) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Live sessions</h1>
        <button onClick={() => setEditing({ data: defaultForm, id: null })} className="btn-primary">+ New session</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No live sessions yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-3">When</th>
                <th className="px-3 py-3">Topic</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Booked</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(s.startTime)}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{s.topic}</p>
                    <p className="text-xs text-gray-500">{s.category}</p>
                  </td>
                  <td className="px-3 py-3">{s.type === 'one_on_one' ? '1-on-1' : 'Group'}</td>
                  <td className="px-3 py-3">{s.bookedCount || 0}{s.capacity ? ` / ${s.capacity}` : ''}</td>
                  <td className="px-3 py-3">{s.priceCents > 0 ? formatMoney(s.priceCents, s.currency) : 'Free'}</td>
                  <td className="px-3 py-3"><span className={`badge ${statusBadgeClass(s.status)}`}>{s.status}</span></td>
                  <td className="px-3 py-3 text-right space-x-2">
                    <button onClick={() => setEditing({ data: hydrateForm(s), id: s.id })} className="text-brand-700 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SessionForm
          initial={editing.data}
          onClose={() => setEditing(null)}
          onSubmit={(form) => handleSave(form, editing.id)}
        />
      )}
    </div>
  );
}

function hydrateForm(s) {
  return {
    type: s.type || 'one_on_one',
    topic: s.topic || '',
    category: s.category || '',
    startTime: s.startTime?.toDate?.().toISOString().slice(0, 16) || '',
    endTime: s.endTime?.toDate?.().toISOString().slice(0, 16) || '',
    capacity: s.capacity || 1,
    priceCents: (s.priceCents || 0) / 100,
    currency: s.currency || 'USD',
    meetingUrl: s.meetingUrl || '',
    whatsappGroupUrl: s.whatsappGroupUrl || '',
    status: s.status || 'open'
  };
}

function SessionForm({ initial, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40 overflow-auto" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="card max-w-2xl w-full p-6 my-8 space-y-3 grid sm:grid-cols-2 gap-3"
      >
        <h3 className="sm:col-span-2 text-lg font-display font-bold">Session</h3>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
            <option value="one_on_one">1-on-1</option>
            <option value="group_class">Group class</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
            <option value="open">Open</option>
            <option value="full">Full</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Topic / title</label>
          <input required className="input" value={form.topic} onChange={(e) => setForm((s) => ({ ...s, topic: e.target.value }))} />
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} placeholder="e.g. Business English" />
        </div>
        <div>
          <label className="label">Capacity</label>
          <input type="number" className="input" value={form.capacity} onChange={(e) => setForm((s) => ({ ...s, capacity: e.target.value }))} />
        </div>
        <div>
          <label className="label">Start time</label>
          <input type="datetime-local" required className="input" value={form.startTime} onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))} />
        </div>
        <div>
          <label className="label">End time</label>
          <input type="datetime-local" className="input" value={form.endTime} onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))} />
        </div>
        <div>
          <label className="label">Price</label>
          <input type="number" step="0.01" className="input" value={form.priceCents} onChange={(e) => setForm((s) => ({ ...s, priceCents: e.target.value }))} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input className="input" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Meeting URL (Zoom/Meet)</label>
          <input className="input" value={form.meetingUrl} onChange={(e) => setForm((s) => ({ ...s, meetingUrl: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">WhatsApp group invite link (for group classes)</label>
          <input className="input" value={form.whatsappGroupUrl} onChange={(e) => setForm((s) => ({ ...s, whatsappGroupUrl: e.target.value }))} />
        </div>
        <div className="sm:col-span-2 flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Save session</button>
        </div>
      </form>
    </div>
  );
}
