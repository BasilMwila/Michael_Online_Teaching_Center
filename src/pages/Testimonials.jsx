import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedTestimonials } from '../lib/testimonials.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';
import Empty from '../components/Empty.jsx';

export default function Testimonials() {
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    listPublishedTestimonials().then(setItems).catch(() => setItems([]));
  }, []);

  const videos = items?.filter((t) => t.videoUrl) || [];
  const written = items?.filter((t) => !t.videoUrl) || [];

  return (
    <div>
      <PageHeader title="Student stories" subtitle="What graduates of Empire Skills are saying — in their own words.">
        {firebaseUser ? (
          <Link to="/submit-testimonial" className="btn bg-white text-brand-700 hover:bg-brand-50">Share your story</Link>
        ) : (
          <Link to="/signup" className="btn bg-white text-brand-700 hover:bg-brand-50">Join to share yours</Link>
        )}
      </PageHeader>

      <div className="max-w-7xl mx-auto container-px py-12 space-y-12">
        {items === null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty title="No testimonials yet" message="Be the first to share your experience after completing a course." />
        ) : (
          <>
            {videos.length > 0 && (
              <section>
                <h2 className="text-2xl font-display font-bold mb-4">Video testimonials</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {videos.map((t) => (
                    <article key={t.id} className="card overflow-hidden">
                      <video src={t.videoUrl} controls className="w-full aspect-video bg-black" />
                      <div className="p-4">
                        <div className="flex items-center gap-1 text-amber-400 text-sm mb-1">
                          {Array.from({ length: t.rating || 5 }).map((_, i) => <span key={i}>★</span>)}
                        </div>
                        <p className="font-semibold text-sm">{t.authorName}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {written.length > 0 && (
              <section>
                <h2 className="text-2xl font-display font-bold mb-4">Written testimonials</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {written.map((t) => (
                    <article key={t.id} className="card p-6">
                      <div className="flex items-center gap-1 text-amber-400 mb-3">
                        {Array.from({ length: t.rating || 5 }).map((_, i) => <span key={i}>★</span>)}
                      </div>
                      <p className="text-gray-700 mb-4 italic">"{t.content}"</p>
                      <p className="text-sm font-semibold text-gray-900">— {t.authorName}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
