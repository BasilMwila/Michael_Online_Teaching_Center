import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listAllCourses, createCourse, deleteCourse } from '../../lib/courses.js';
import { formatMoney } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

export default function AdminCourses() {
  const [items, setItems] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  async function refresh() {
    setItems(await listAllCourses());
  }
  useEffect(() => { refresh(); }, []);

  async function handleCreate(form) {
    try {
      const id = await createCourse({
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        category: form.category,
        mode: form.mode,
        priceCents: Math.round(Number(form.price) * 100),
        currency: form.currency,
        durationHours: Number(form.durationHours) || null,
        instructorName: form.instructorName,
        coverImageUrl: form.coverImageUrl,
        learningOutcomes: form.learningOutcomes
          ? form.learningOutcomes.split('\n').map((s) => s.trim()).filter(Boolean)
          : [],
        isPublished: false
      });
      toast.success('Course created');
      setShowNew(false);
      navigate(`/admin/courses/${id}`);
    } catch {
      toast.error('Could not create course');
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    await deleteCourse(c.id);
    toast.success('Course deleted');
    refresh();
  }

  if (!items) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Courses</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New course</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No courses yet. Create your first one.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.category}</p>
                  </td>
                  <td className="px-4 py-3">{c.mode === 'live' ? 'Live' : 'Self-paced'}</td>
                  <td className="px-4 py-3">{formatMoney(c.priceCents, c.currency || 'USD')}</td>
                  <td className="px-4 py-3">
                    {c.isPublished ? <span className="badge bg-emerald-100 text-emerald-800">Published</span> : <span className="badge bg-gray-200 text-gray-700">Draft</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link to={`/admin/courses/${c.id}`} className="text-brand-700 hover:underline">Edit</Link>
                    <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewCourseModal onClose={() => setShowNew(false)} onSubmit={handleCreate} />}
    </div>
  );
}

function NewCourseModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: '',
    mode: 'self_paced',
    price: '',
    currency: 'USD',
    durationHours: '',
    instructorName: '',
    coverImageUrl: '',
    learningOutcomes: ''
  });

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40 overflow-auto" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="card max-w-2xl w-full p-6 space-y-3 my-8"
      >
        <h2 className="text-xl font-display font-bold">New course</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input required value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Category</label>
            <input value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="input" placeholder="e.g. Programming" />
          </div>
          <div>
            <label className="label">Mode</label>
            <select value={form.mode} onChange={(e) => setForm((s) => ({ ...s, mode: e.target.value }))} className="input">
              <option value="self_paced">Self-paced</option>
              <option value="live">Live class</option>
            </select>
          </div>
          <div>
            <label className="label">Price</label>
            <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Currency</label>
            <input value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} className="input" />
          </div>
          <div>
            <label className="label">Duration (hours)</label>
            <input type="number" value={form.durationHours} onChange={(e) => setForm((s) => ({ ...s, durationHours: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Instructor name</label>
            <input value={form.instructorName} onChange={(e) => setForm((s) => ({ ...s, instructorName: e.target.value }))} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Cover image URL</label>
            <input value={form.coverImageUrl} onChange={(e) => setForm((s) => ({ ...s, coverImageUrl: e.target.value }))} className="input" placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Short description</label>
            <input value={form.shortDescription} onChange={(e) => setForm((s) => ({ ...s, shortDescription: e.target.value }))} className="input" placeholder="One sentence pitch" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Full description</label>
            <textarea required rows={4} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Learning outcomes (one per line)</label>
            <textarea rows={4} value={form.learningOutcomes} onChange={(e) => setForm((s) => ({ ...s, learningOutcomes: e.target.value }))} className="input" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Create course</button>
        </div>
      </form>
    </div>
  );
}
