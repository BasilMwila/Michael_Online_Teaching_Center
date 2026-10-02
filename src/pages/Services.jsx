import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedCourses } from '../lib/courses.js';
import { SERVICE_CATEGORIES } from '../lib/categories.js';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';

// Presentation for each service. The category strings must match
// SERVICE_CATEGORIES so the course counts and filter links line up.
const SERVICES = {
  'Courses': {
    icon: 'book-open',
    blurb:
      'Self-paced and instructor-led programmes across management, safety, procurement and professional skills — each with lesson notes, narration and a quiz to pass before moving on.',
    cta: 'Browse the catalogue'
  },
  'IELTS/PTE': {
    icon: 'globe',
    blurb:
      'Preparation for the IELTS and PTE English tests, including UKVI, with one-to-one tutoring and practice built around the band score you need.',
    cta: 'See IELTS & PTE options'
  },
  'CV Design/Revamp': {
    icon: 'id-badge',
    blurb:
      'Have your CV rewritten and redesigned so your experience reads clearly to recruiters and stands up to screening.',
    cta: 'See CV services'
  },
  'Learn How To Teach Online': {
    icon: 'video',
    blurb:
      'Training for teachers and professionals who want to move their teaching online — planning lessons, running sessions, and reaching students beyond the classroom.',
    cta: 'See training options'
  }
};

export default function Services() {
  const [courses, setCourses] = useState(null);

  useEffect(() => {
    listPublishedCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  const countFor = (category) =>
    courses ? courses.filter((c) => c.category === category).length : null;

  return (
    <div>
      <PageHeader
        title="Our services"
        subtitle="Everything Empire Skills Academy offers, in one place. Never stop growing."
      />

      <div className="max-w-6xl mx-auto container-px py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {SERVICE_CATEGORIES.map((category) => {
            const service = SERVICES[category];
            const count = countFor(category);

            return (
              <article key={category} className="card p-7 flex flex-col">
                {/* Letterhead rule, as on the rest of the site */}
                <div className="flex h-1 -mt-7 -mx-7 mb-6" aria-hidden="true">
                  <div className="w-[78%] bg-accent-500" />
                  <div className="flex-1 bg-brand-900" />
                </div>

                <div className="icon-tile bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700">
                  <Icon name={service.icon} size={24} strokeWidth={2} />
                </div>

                <h2 className="mt-5 text-xl font-display font-bold text-ink-900">{category}</h2>
                <p className="mt-2.5 text-ink-600 leading-relaxed flex-1">{service.blurb}</p>

                <div className="mt-5 pt-5 border-t border-ink-100 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-ink-500">
                    {count === null
                      ? 'Loading…'
                      : count > 0
                        ? `${count} ${count === 1 ? 'programme' : 'programmes'} available`
                        : 'Programmes coming soon'}
                  </span>
                  <Link
                    to={`/courses?category=${encodeURIComponent(category)}`}
                    className="btn-primary text-sm"
                  >
                    {service.cta}
                    <Icon name="arrow-right" size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Enquiry prompt */}
        <section className="card p-8 sm:p-10 mt-10 text-center">
          <h2 className="text-2xl font-display font-bold text-ink-900">
            Not sure which service fits?
          </h2>
          <p className="mt-3 text-ink-600 max-w-xl mx-auto leading-relaxed">
            Tell us what you are working towards and we will point you to the right programme.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link to="/contact" className="btn-primary">
              Talk to us
              <Icon name="arrow-right" size={16} />
            </Link>
            <Link to="/courses" className="btn-secondary">See everything on offer</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
