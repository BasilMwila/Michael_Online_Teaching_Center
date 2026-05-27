import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { listAllTestimonials, setTestimonialPublished, deleteTestimonial } from '../../lib/testimonials.js';
import { formatDateTime } from '../../lib/format.js';
import Spinner from '../../components/Spinner.jsx';

export default function AdminTestimonials() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');

  async function refresh() { setItems(await listAllTestimonials()); }
  useEffect(() => { refresh(); }, []);

  async function togglePublish(t) {
    await setTestimonialPublished(t.id, !t.isPublished);
    toast.success(t.isPublished ? 'Unpublished' : 'Published');
    refresh();
  }

  async function handleDelete(t) {
    if (!confirm('Delete this testimonial?')) return;
    await deleteTestimonial(t.id);
    toast.success('Deleted');
    refresh();
  }

  if (!items) return <Spinner />;
  const filtered = items.filter((t) =>
    filter === 'pending' ? !t.isPublished :
    filter === 'published' ? t.isPublished : true
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Testimonials</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-44">
          <option value="all">All</option>
          <option value="pending">Pending review</option>
          <option value="published">Published</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No testimonials.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <article key={t.id} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">{t.authorName}</p>
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => <span key={i}>★</span>)}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">{formatDateTime(t.createdAt)}</p>
              {t.videoUrl && (
                <video src={t.videoUrl} controls className="w-full aspect-video bg-black rounded mb-3" />
              )}
              <p className="text-gray-700 italic mb-3">"{t.content}"</p>
              <div className="flex justify-between items-center">
                <span className={`badge ${t.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {t.isPublished ? 'Published' : 'Pending'}
                </span>
                <div className="space-x-3 text-sm">
                  <button onClick={() => togglePublish(t)} className="text-brand-700 hover:underline">
                    {t.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => handleDelete(t)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
