import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedTestimonials } from '../lib/testimonials.js';
import { STUDENT_STORIES, VIDEO_STORIES } from '../lib/studentStories.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';
import Icon from '../components/Icon.jsx';
import { StudentStoryFull, VideoStory } from '../components/StudentStory.jsx';

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
      <PageHeader title="Student stories" subtitle="What graduates of Empire Skills Academy are saying — in their own words.">
        {firebaseUser ? (
          <Link to="/submit-testimonial" className="btn bg-white text-brand-700 hover:bg-brand-50">Share your story</Link>
        ) : (
          <Link to="/signup" className="btn bg-white text-brand-700 hover:bg-brand-50">Join to share yours</Link>
        )}
      </PageHeader>

      {/* VIDEO TESTIMONIALS */}
      <section className="bg-brand-950 relative overflow-hidden border-b-4 border-accent-500">
        <div className="absolute inset-0 bg-mesh-dark opacity-60" />
        <div className="absolute inset-0 pattern-dots opacity-20" />
        <div className="relative max-w-7xl mx-auto container-px py-16">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-accent-400 uppercase tracking-wider">On camera</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-white">Video testimonials</h2>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-12 sm:gap-16">
            {VIDEO_STORIES.map((v) => (
              <VideoStory key={v.id} story={v} />
            ))}
            {videos.map((t) => (
              <VideoStory
                key={t.id}
                story={{ src: t.videoUrl, title: t.authorName, blurb: t.content }}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto container-px py-16 space-y-16">
        {/* STUDENT'S CORNER */}
        <section>
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Student&rsquo;s corner</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold text-ink-900">In their own words</h2>
            <p className="mt-3 text-ink-600 max-w-2xl mx-auto">
              Learners and partners who studied with us — what they took away, and where they are now.
            </p>
          </div>
          <div className="space-y-8">
            {STUDENT_STORIES.map((s) => (
              <StudentStoryFull key={s.id} story={s} />
            ))}
          </div>
        </section>

        {/* WRITTEN TESTIMONIALS FROM THE SITE */}
        {items === null ? (
          <Spinner />
        ) : written.length > 0 ? (
          <section>
            <h2 className="text-2xl font-display font-bold mb-6 text-ink-900">More from our learners</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {written.map((t) => (
                <article key={t.id} className="card p-6">
                  <div className="flex items-center gap-0.5 text-accent-400 mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => <Icon key={i} name="star" size={16} />)}
                  </div>
                  <p className="text-ink-700 mb-4 italic leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                  <p className="text-sm font-semibold text-ink-900">— {t.authorName}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="card p-8 sm:p-10 text-center">
          <h2 className="text-2xl font-display font-bold text-ink-900">Studied with us? Tell your story.</h2>
          <p className="mt-3 text-ink-600 max-w-xl mx-auto">
            Your experience helps the next learner decide. Share a few words — or record a short video.
          </p>
          <div className="mt-6">
            {firebaseUser ? (
              <Link to="/submit-testimonial" className="btn-primary">
                Share your story
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : (
              <Link to="/signup" className="btn-primary">
                Create an account to share
                <Icon name="arrow-right" size={16} />
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
