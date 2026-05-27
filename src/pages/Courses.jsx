import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedCourses } from '../lib/courses.js';
import { formatMoney } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';
import Empty from '../components/Empty.jsx';

export default function Courses() {
  const [courses, setCourses] = useState(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('all');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    listPublishedCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  const categories = useMemo(() => {
    if (!courses) return [];
    return Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
  }, [courses]);

  const filtered = useMemo(() => {
    if (!courses) return [];
    return courses.filter((c) => {
      if (mode !== 'all' && c.mode !== mode) return false;
      if (category !== 'all' && c.category !== category) return false;
      if (search && !`${c.title} ${c.description}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [courses, search, mode, category]);

  return (
    <div>
      <PageHeader title="All courses" subtitle="Browse our complete catalog. Self-paced or live — learn what excites you." />
      <div className="max-w-7xl mx-auto container-px py-10">
        <div className="card p-4 mb-8 flex flex-col md:flex-row gap-3">
          <input
            type="search"
            placeholder="Search by title or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input md:flex-1"
          />
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="input md:w-44">
            <option value="all">All modes</option>
            <option value="self_paced">Self-paced</option>
            <option value="live">Live class</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input md:w-44">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {courses === null ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty title="No courses match your filters" message="Try changing your search or filter selection." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link key={c.id} to={`/courses/${c.id}`} className="card overflow-hidden hover:shadow-lg transition group">
                <div className="aspect-video bg-gradient-to-br from-brand-100 to-brand-300 grid place-items-center text-brand-700 text-5xl">
                  {c.coverImageUrl ? (
                    <img src={c.coverImageUrl} alt={c.title} className="w-full h-full object-cover" />
                  ) : '🎓'}
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {c.category && <span className="badge bg-brand-100 text-brand-700">{c.category}</span>}
                    <span className="badge bg-gray-100 text-gray-700">{c.mode === 'live' ? 'Live class' : 'Self-paced'}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-brand-700">{c.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{c.shortDescription || c.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-brand-700">{formatMoney(c.priceCents, c.currency || 'USD')}</span>
                    <span className="text-sm text-gray-500">{c.durationHours ? `${c.durationHours}h` : ''}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
