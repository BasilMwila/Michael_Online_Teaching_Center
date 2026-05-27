import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedCourses } from '../lib/courses.js';
import { listPublishedTestimonials } from '../lib/testimonials.js';
import { formatMoney } from '../lib/format.js';
import Spinner from '../components/Spinner.jsx';

export default function Home() {
  const [courses, setCourses] = useState(null);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    listPublishedCourses().then(setCourses).catch(() => setCourses([]));
    listPublishedTestimonials().then((t) => setTestimonials(t.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-7xl mx-auto container-px py-20 sm:py-28 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-sm font-medium backdrop-blur mb-5">
            🎓 Empire Skills Training Center
          </span>
          <h1 className="text-4xl sm:text-6xl font-display font-bold mb-5 leading-tight">
            Build the skills that<br className="hidden sm:block" /> build your future
          </h1>
          <p className="text-lg sm:text-xl text-brand-50/90 max-w-2xl mx-auto mb-8">
            Self-paced video courses, live coaching, and a supportive community. Earn a unique student ID, learn at your pace, and graduate ready.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/courses" className="btn bg-white text-brand-700 hover:bg-brand-50">Browse courses →</Link>
            <Link to="/signup" className="btn bg-brand-500 text-white hover:bg-brand-400 border border-brand-400">Get started free</Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto text-center">
            <Stat number={courses?.length ?? '—'} label="Courses" />
            <Stat number="∞" label="Lifetime access" />
            <Stat number="24/7" label="Learn anywhere" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto container-px py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold mb-2">Why Empire Skills</h2>
          <p className="text-gray-600">Built for serious learners — at any device, any pace.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon="📺"
            title="Self-paced video lessons"
            text="Pre-recorded HD lessons you can pause, rewind, and revisit. Each lesson is paired with a short quiz."
          />
          <Feature
            icon="🎯"
            title="Live coaching + WhatsApp"
            text="Live classes coordinate via WhatsApp groups. Or book 1-on-1 live coaching slots from the calendar."
          />
          <Feature
            icon="🆔"
            title="Unique student ID"
            text="Every learner gets a permanent ID at signup — used for course access, certificates, and support."
          />
          <Feature
            icon="🏦"
            title="Simple bank payments"
            text="Pay by bank transfer, upload proof, and we activate your access within one business day."
          />
          <Feature
            icon="📱"
            title="Works on any device"
            text="Fully responsive. Learn on your phone during a commute, finish on your laptop at home."
          />
          <Feature
            icon="🤖"
            title="Always-on chatbot"
            text="Stuck? The site chatbot answers common questions about pricing, payments, and enrollment instantly."
          />
        </div>
      </section>

      <section className="bg-white py-16 border-t border-b">
        <div className="max-w-7xl mx-auto container-px">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Featured courses</h2>
              <p className="text-gray-600">Hand-picked programs to accelerate your career.</p>
            </div>
            <Link to="/courses" className="text-brand-700 font-semibold hidden sm:inline">See all →</Link>
          </div>
          {courses === null ? (
            <Spinner />
          ) : courses.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Courses are coming soon. Subscribe below to get notified!</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="max-w-7xl mx-auto container-px py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-2">Loved by learners</h2>
            <p className="text-gray-600">Real words from graduates of our programs.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <article key={t.id} className="card p-6">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => <span key={i}>★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"{t.content}"</p>
                <p className="text-sm font-semibold text-gray-900">— {t.authorName}</p>
              </article>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/testimonials" className="btn-secondary">Read all testimonials</Link>
          </div>
        </section>
      )}

      <section className="bg-brand-600 text-white">
        <div className="max-w-4xl mx-auto container-px py-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Ready to start?</h2>
          <p className="text-brand-50 mb-6 text-lg">Create your free account in under a minute and claim your student ID.</p>
          <Link to="/signup" className="btn bg-white text-brand-700 hover:bg-brand-50">Create my account</Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ number, label }) {
  return (
    <div>
      <div className="text-3xl font-bold">{number}</div>
      <div className="text-sm text-brand-100">{label}</div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <article className="card p-6 hover:shadow-md transition">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{text}</p>
    </article>
  );
}

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.id}`} className="card overflow-hidden hover:shadow-lg transition group">
      <div className="aspect-video bg-gradient-to-br from-brand-100 to-brand-300 grid place-items-center text-brand-700 text-5xl">
        {course.coverImageUrl ? (
          <img src={course.coverImageUrl} alt={course.title} className="w-full h-full object-cover" />
        ) : '🎓'}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge bg-brand-100 text-brand-700">{course.category || 'General'}</span>
          <span className="badge bg-gray-100 text-gray-700">{course.mode === 'live' ? 'Live class' : 'Self-paced'}</span>
        </div>
        <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-brand-700">{course.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{course.shortDescription || course.description}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-brand-700">{formatMoney(course.priceCents, course.currency || 'USD')}</span>
          <span className="text-sm text-gray-500">{course.durationHours ? `${course.durationHours}h` : ''}</span>
        </div>
      </div>
    </Link>
  );
}
