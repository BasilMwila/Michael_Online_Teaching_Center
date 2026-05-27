import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { listAllUsers, addWhatsappGroupMember } from '../../lib/users.js';
import { listAllSessions } from '../../lib/liveSessions.js';
import { listAllCourses } from '../../lib/courses.js';
import { formatDateTime } from '../../lib/format.js';
import { collection, getDocs, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import Spinner from '../../components/Spinner.jsx';

export default function AdminWhatsapp() {
  const { firebaseUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [members, setMembers] = useState(null);
  const [form, setForm] = useState({
    userId: '',
    target: '',
    groupName: '',
    groupUrl: ''
  });

  async function refresh() {
    const [u, s, c] = await Promise.all([listAllUsers(), listAllSessions(), listAllCourses()]);
    setUsers(u.filter((x) => x.role === 'student'));
    setSessions(s);
    setCourses(c.filter((c) => c.mode === 'live'));
    const snap = await getDocs(query(collection(db, 'whatsappGroupMembers'), orderBy('addedAt', 'desc')));
    setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const user = users.find((u) => u.uid === form.userId);
    if (!user) return toast.error('Pick a student');
    const [kind, id] = form.target.split(':');
    try {
      await addWhatsappGroupMember({
        userId: user.uid,
        studentId: user.studentId,
        fullName: user.fullName,
        sessionId: kind === 'session' ? id : null,
        courseId: kind === 'course' ? id : null,
        groupName: form.groupName,
        groupUrl: form.groupUrl,
        addedBy: firebaseUser.uid
      });
      toast.success('Member added to WhatsApp group');
      setForm({ userId: '', target: '', groupName: '', groupUrl: '' });
      refresh();
    } catch {
      toast.error('Could not add member');
    }
  }

  async function handleRemove(m) {
    if (!confirm('Remove this WhatsApp group record?')) return;
    await deleteDoc(doc(db, 'whatsappGroupMembers', m.id));
    toast.success('Removed');
    refresh();
  }

  if (members === null) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">WhatsApp groups</h1>
      <p className="text-sm text-gray-600 mb-6">
        Record students you've added to your WhatsApp class groups so the platform tracks who has access.
      </p>

      <form onSubmit={handleAdd} className="card p-5 mb-8 grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Student</label>
          <select required className="input" value={form.userId} onChange={(e) => setForm((s) => ({ ...s, userId: e.target.value }))}>
            <option value="">— Pick a student —</option>
            {users.map((u) => <option key={u.uid} value={u.uid}>{u.studentId} · {u.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Group / Course / Session</label>
          <select required className="input" value={form.target} onChange={(e) => setForm((s) => ({ ...s, target: e.target.value }))}>
            <option value="">— Pick one —</option>
            {courses.length > 0 && <optgroup label="Live courses">{courses.map((c) => <option key={c.id} value={`course:${c.id}`}>{c.title}</option>)}</optgroup>}
            {sessions.length > 0 && <optgroup label="Live sessions">{sessions.map((s) => <option key={s.id} value={`session:${s.id}`}>{s.topic} — {formatDateTime(s.startTime)}</option>)}</optgroup>}
          </select>
        </div>
        <div>
          <label className="label">Group name</label>
          <input className="input" value={form.groupName} onChange={(e) => setForm((s) => ({ ...s, groupName: e.target.value }))} placeholder="e.g. Business English Apr 2026" />
        </div>
        <div>
          <label className="label">Invite link (optional)</label>
          <input className="input" value={form.groupUrl} onChange={(e) => setForm((s) => ({ ...s, groupUrl: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary w-full">Record member</button>
        </div>
      </form>

      <h2 className="font-semibold mb-3">Members ({members.length})</h2>
      {members.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No members recorded yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-3">Added</th>
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Group</th>
                <th className="px-3 py-3">Link</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(m.addedAt)}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{m.fullName}</p>
                    <p className="font-mono text-xs text-gray-500">{m.studentId}</p>
                  </td>
                  <td className="px-3 py-3">{m.groupName || '—'}</td>
                  <td className="px-3 py-3">
                    {m.groupUrl ? <a href={m.groupUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">Open</a> : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => handleRemove(m)} className="text-red-600 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
