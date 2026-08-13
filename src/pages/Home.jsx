import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedCourses } from '../lib/courses.js';
import { listPublishedTestimonials } from '../lib/testimonials.js';
import { formatMoney } from '../lib/format.js';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';

const FEATURES = [
  { icon: 'video', title: 'Self-paced video lessons', text: 'Pre-recorded HD lessons you can pause, rewind, and revisit. Each lesson is paired with a short quiz.', tint: 'from-brand-50 to-brand-100', iconColor: 'text-brand-600' },
  { icon: 'calendar', title: 'Live coaching + WhatsApp', text: 'Live classes coordinate via WhatsApp groups. Or book 1-on-1 live coaching slots from the calendar.', tint: 'from-accent-50 to-accent-100', iconColor: 'text-accent-600' },
  { icon: 'id-badge', title: 'Unique student ID', text: 'Every learner gets a permanent ID at signup — used for course access, certificates, and support.', tint: 'from-brand-50 to-brand-100', iconColor: 'text-brand-600' },
  { icon: 'credit-card', title: 'Simple bank payments', text: 'Pay by bank transfer, upload proof, and we activate your access within one business day.', tint: 'from-accent-50 to-accent-100', iconColor: 'text-accent-600' },
  { icon: 'devices', title: 'Works on any device', text: 'Fully responsive. Learn on your phone during a commute, finish on your laptop at home.', tint: 'from-brand-50 to-brand-100', iconColor: 'text-brand-600' },
  { icon: 'message-bot', title: 'Always-on chatbot', text: 'Stuck? The site chatbot answers common questions about pricing, payments, and enrollment instantly.', tint: 'from-accent-50 to-accent-100', iconColor: 'text-accent-600' }
];

export default function Home() {
  const [courses, setCourses] = useState(null);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    listPublishedCourses().then(setCourses).catch(() => setCourses([]));
    listPublishedTestimonials().then((t) => setTestimonials(t.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative bg-brand-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-mesh-dark" />
        <div className="absolute inset-0 pattern-grid opacity-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-accent-400/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto container-px pt-20 pb-24 sm:pt-28 sm:pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur text-xs font-semibold text-brand-100">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
              ACCREDITED ONLINE TRAINING
            </span>
            <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold leading-[1.05]">
              Build the skills that<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-300 via-accent-300 to-brand-400">
                build your future
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-ink-200 max-w-xl leading-relaxed">
              Self-paced video courses, live coaching, and a community that backs your growth.
              Earn your unique student ID and learn at your own pace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className="btn-white">
                Browse courses
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link to="/signup" className="btn bg-white/10 backdrop-blur text-white border border-white/20 hover:bg-white/15">
                <Icon name="sparkles" size={18} />
                Get started free
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <HeroStat number={courses?.length ?? '—'} label="Courses" />
              <HeroStat number="∞" label="Lifetime access" />
              <HeroStat number="24/7" label="Learning" />
            </div>
          </div>

          <div className="relative hidden lg:block animate-fade-in">
            <div className="relative max-w-md mx-auto">
              {/* Floating preview cards */}
              <div className="absolute -top-6 -left-6 card p-4 w-60 shadow-glow text-ink-900 animate-float" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3">
                  <div className="icon-tile bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                    <Icon name="play-circle" size={22} />
                  </div>
                  <div>
                    <p className="text-xs text-ink-400 font-medium">Now playing</p>
                    <p className="font-semibold text-sm">Lesson 4 of 12</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-brand-500 to-brand-400 rounded-full" />
                </div>
              </div>

              <div className="absolute -bottom-6 -right-6 card p-4 w-64 shadow-glow text-ink-900 animate-float" style={{ animationDelay: '1.2s' }}>
                <div className="flex items-center gap-3">
                  <div className="icon-tile bg-accent-100 text-accent-600">
                    <Icon name="id-badge" size={22} />
                  </div>
                  <div>
                    <p className="text-xs text-ink-400 font-medium">Student ID</p>
                    <p className="font-mono font-bold text-sm">EST-2026-00042</p>
                  </div>
                </div>
              </div>

              {/* Main mock card */}
              <div className="card p-6 text-ink-900 shadow-lift">
                <div className="aspect-video bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 pattern-dots opacity-50" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="w-16 h-16 rounded-full bg-white/95 grid place-items-center shadow-lg">
                      <Icon name="play-circle" size={36} className="text-brand-600 ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-brand-100 text-brand-700">Featured</span>
                    <span className="text-xs text-ink-400">12 lessons · 4h 30m</span>
                  </div>
                  <h3 className="font-semibold">Advanced Digital Marketing</h3>
                  <div className="flex items-center gap-1 text-accent-400">
                    {[1,2,3,4,5].map((i) => <Icon key={i} name="star" size={14} />)}
                    <span className="text-xs text-ink-600 ml-1">4.9 · 124 reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO TESTIMONIAL */}
      <section className="bg-brand-950 relative overflow-hidden border-t-4 border-accent-500">
        <div className="absolute inset-0 bg-mesh-dark opacity-60" />
        <div className="absolute inset-0 pattern-dots opacity-20" />
        <div className="relative max-w-7xl mx-auto container-px py-16 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <p className="text-sm font-semibold text-accent-400 uppercase tracking-wider">In their own words</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-white">Hear from a student</h2>
            <p className="mt-4 text-ink-200 text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
              Real feedback from someone who trained with Empire Skills — unscripted, in their own voice.
            </p>
            <div className="mt-6 flex gap-0.5 text-accent-400 justify-center lg:justify-start">
              {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={18} />)}
            </div>
            <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
              <Link to="/testimonials" className="btn-white">
                Read more stories
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link to="/courses" className="btn bg-white/10 backdrop-blur text-white border border-white/20 hover:bg-white/15">
                Browse courses
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-[300px]">
              <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-br from-accent-400/40 via-transparent to-brand-400/30 blur-xl" />
              <video
                src="https://res.cloudinary.com/dhx7e5lt7/video/upload/testimonials/es6esn6ksftkcyxatgbv.mp4"
                poster="https://res.cloudinary.com/dhx7e5lt7/video/upload/so_1/testimonials/es6esn6ksftkcyxatgbv.jpg"
                className="relative w-full rounded-[2rem] border-4 border-white/10 shadow-lift bg-black"
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 max-w-7xl mx-auto container-px">
        <div className="text-center mb-12 mt-12">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Why Empire Skills</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-ink-900">Everything you need to grow</h2>
          <p className="mt-3 text-ink-600 max-w-2xl mx-auto">Built for serious learners — clear paths, real outcomes, no fluff.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="card-hover p-6 group">
              <div className={`icon-tile bg-gradient-to-br ${f.tint} ${f.iconColor} group-hover:scale-110 transition-transform`}>
                <Icon name={f.icon} size={24} strokeWidth={2} />
              </div>
              <h3 className="mt-5 font-semibold text-lg text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* COURSES */}
      <section className="mt-24 py-20 bg-white border-y border-ink-100">
        <div className="max-w-7xl mx-auto container-px">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Catalog</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold text-ink-900">Featured courses</h2>
              <p className="mt-2 text-ink-600">Hand-picked programs to accelerate your career.</p>
            </div>
            <Link to="/courses" className="btn-secondary">
              See all
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          {courses === null ? (
            <Spinner />
          ) : courses.length === 0 ? (
            <div className="text-center py-16 card">
              <div className="icon-tile mx-auto bg-brand-50 text-brand-600">
                <Icon name="book-open" size={26} />
              </div>
              <p className="mt-4 text-ink-600">Courses are launching soon. Subscribe below to be first to know.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto container-px">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Student stories</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold text-ink-900">Loved by learners</h2>
              <p className="mt-3 text-ink-600">Real words from graduates of our programs.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <article key={t.id} className="card p-7 relative overflow-hidden">
                  <div className="absolute -top-6 -left-2 text-9xl text-brand-100 font-display font-bold leading-none select-none">"</div>
                  <div className="relative">
                    <div className="flex gap-0.5 text-accent-400 mb-4">
                      {Array.from({ length: t.rating || 5 }).map((_, i) => <Icon key={i} name="star" size={16} />)}
                    </div>
                    <p className="text-ink-800 leading-relaxed mb-5">{t.content}</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-ink-100">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-bold">
                        {t.authorName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-ink-900">{t.authorName}</p>
                        <p className="text-xs text-ink-400">Graduate</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/testimonials" className="btn-secondary">
                Read all testimonials
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative py-20 bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-accent-400/10 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto container-px text-center">
          <Icon name="sparkles" size={32} className="mx-auto text-accent-300" />
          <h2 className="mt-4 text-3xl sm:text-5xl font-display font-bold leading-tight">
            Ready to start your journey?
          </h2>
          <p className="mt-4 text-brand-100 text-lg max-w-2xl mx-auto">
            Create your free account in under a minute. Claim your unique student ID and unlock the catalog.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/signup" className="btn-white">
              Create my account
              <Icon name="arrow-right" size={18} />
            </Link>
            <Link to="/courses" className="btn bg-white/10 backdrop-blur text-white border border-white/20 hover:bg-white/15">
              Explore courses first
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ number, label }) {
  return (
    <div>
      <div className="text-3xl sm:text-4xl font-display font-bold text-white">{number}</div>
      <div className="text-xs text-ink-400 mt-1 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.id}`} className="card-hover overflow-hidden group block">
      <div className="aspect-video bg-gradient-to-br from-brand-100 via-brand-200 to-accent-100 relative overflow-hidden">
        {course.coverImageUrl ? (
          <img src={course.coverImageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Icon name="graduation-cap" size={48} className="text-brand-700/40" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {course.category && <span className="badge bg-white/95 backdrop-blur text-brand-700 shadow-sm">{course.category}</span>}
        </div>
        <div className="absolute top-3 right-3">
          <span className="badge bg-ink-900/80 backdrop-blur text-white">
            <Icon name={course.mode === 'live' ? 'calendar' : 'video'} size={12} />
            {course.mode === 'live' ? 'Live' : 'Self-paced'}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold text-lg text-ink-900 mb-1.5 group-hover:text-brand-700 transition line-clamp-2">{course.title}</h3>
        <p className="text-sm text-ink-600 line-clamp-2 mb-4">{course.shortDescription || course.description}</p>
        <div className="flex justify-between items-center pt-4 border-t border-ink-100">
          <span className="font-display font-bold text-brand-700 text-lg">{formatMoney(course.priceCents, course.currency || 'USD')}</span>
          {course.durationHours && (
            <span className="flex items-center gap-1 text-xs text-ink-400 font-medium">
              <Icon name="clock" size={14} />
              {course.durationHours}h
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
