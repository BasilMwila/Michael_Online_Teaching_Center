import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { serviceBySlug } from '../lib/services.js';
import { matchesCategory } from '../lib/categories.js';
import { listPublishedCourses } from '../lib/courses.js';
import { formatMoney } from '../lib/format.js';
import Spinner from '../components/Spinner.jsx';
import Icon from '../components/Icon.jsx';
import NotFound from './NotFound.jsx';

/** A gold-ruled bullet list — used for the "which test / what to ask" lists. */
function Bullets({ items }) {
  return (
    <ul className="mt-6 space-y-3 max-w-3xl">
      {items.map((item) => (
        <li key={item.text} className="flex gap-3">
          <span className="mt-0.5 shrink-0 grid place-items-center h-6 w-6 rounded-full bg-accent-100 text-accent-700">
            <Icon name="check" size={14} strokeWidth={3} />
          </span>
          <span className="text-ink-600 leading-relaxed">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Cards for the service menus and the PTE variants. */
function Cards({ items }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.title} className="card card-hover p-5 flex flex-col">
          {item.icon
            ? (
              <span className="icon-tile bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 mb-4 group-hover:scale-110 transition-transform">
                <Icon name={item.icon} size={22} strokeWidth={1.75} />
              </span>
            )
            : <span className="h-1 w-10 rounded-full bg-accent-400 mb-4" aria-hidden="true" />}
          <h3 className="font-display font-semibold text-brand-900 mb-1.5 leading-snug">{item.title}</h3>
          <p className="text-sm text-ink-600 leading-relaxed">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

/** The four exam skills, numbered so they read as a sequence. */
function NumberedGrid({ items }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.title} className="rounded-xl border border-brand-100 bg-brand-50/60 p-5">
          <span className="font-display text-xs font-bold tracking-widest text-accent-600">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="font-display font-semibold text-brand-900 mt-2 mb-1.5">{item.title}</h3>
          <p className="text-sm text-ink-600 leading-relaxed">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function Service({ slug: slugProp }) {
  // Routed by fixed path with a slug prop; useParams is the fallback if the
  // page is ever mounted on a parameterised route.
  const params = useParams();
  const service = serviceBySlug(slugProp || params.slug);
  const [courses, setCourses] = useState(null);

  useEffect(() => {
    let live = true;
    listPublishedCourses()
      .then((list) => { if (live) setCourses(list); })
      .catch(() => { if (live) setCourses([]); });
    return () => { live = false; };
  }, []);

  // Courses filed under this service. Older records may still carry the
  // category's previous name, which matchesCategory accounts for.
  const mine = useMemo(() => {
    if (!courses || !service) return [];
    return courses.filter((c) => matchesCategory(c.category, service.category));
  }, [courses, service]);

  if (!service) return <NotFound />;

  return (
    <div>
      {/* The designed banner carries the headline; everything it says is repeated
          as real text below, so nothing is lost on a narrow screen. */}
      <section className="bg-brand-900">
        <img
          src={service.banner}
          alt={service.bannerAlt}
          width={1600}
          height={640}
          className="w-full h-auto mx-auto max-w-[1600px]"
        />
      </section>

      <section className="bg-white border-b border-ink-100">
        <div className="max-w-7xl mx-auto container-px py-12 sm:py-16">
          <div className="max-w-3xl">
            <span className="badge bg-accent-100 text-accent-700">Empire Skills Academy</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-900 mt-4 mb-5">
              {service.title}
            </h1>
            <p className="text-lg text-ink-600 leading-relaxed">{service.lead}</p>
          </div>

          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {service.stats.map((s) => (
              <div key={s.label} className="card p-5">
                <span className="block font-display text-2xl sm:text-3xl font-bold text-brand-800">{s.value}</span>
                <span className="block text-sm text-ink-600 mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {service.sections.map((section, i) => (
        <section key={section.heading} className={i % 2 === 0 ? 'bg-ink-50' : 'bg-white'}>
          <div className="max-w-7xl mx-auto container-px py-12 sm:py-16">
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-900 mb-5">
                {section.heading}
              </h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="text-ink-600 leading-relaxed mb-4 last:mb-0">{p}</p>
              ))}
            </div>

            {section.layout === 'bullets' && <Bullets items={section.items} />}
            {section.layout === 'cards' && <Cards items={section.items} />}
            {section.layout === 'grid' && <NumberedGrid items={section.items} />}

            {section.note && (
              <p className="mt-8 max-w-3xl border-l-4 border-accent-400 bg-accent-50/60 pl-5 py-4 text-ink-600 leading-relaxed rounded-r-lg">
                {section.note}
              </p>
            )}
          </div>
        </section>
      ))}

      {/* The catalogue for this service, so the tab is useful and not just copy. */}
      <section className="bg-white border-t border-ink-100">
        <div className="max-w-7xl mx-auto container-px py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-900">
              {service.title} courses
            </h2>
            <Link to="/courses" className="btn btn-ghost">
              All courses <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {courses === null ? (
            <Spinner />
          ) : mine.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-ink-600">
                Classes for this service are scheduled on request. Get in touch and we will arrange one
                around the dates you need.
              </p>
              <Link to="/contact" className="btn btn-primary mt-5">
                Talk to us <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((c) => (
                <Link key={c.id} to={`/courses/${c.id}`} className="card overflow-hidden hover:shadow-lg transition group">
                  <div className="aspect-video bg-gradient-to-br from-brand-100 to-brand-300 grid place-items-center text-brand-700">
                    {c.coverImageUrl
                      ? <img src={c.coverImageUrl} alt={c.title} className="w-full h-full object-cover" />
                      : <Icon name="graduation-cap" size={48} strokeWidth={1.5} />}
                  </div>
                  <div className="p-5">
                    <span className="badge bg-gray-100 text-gray-700 mb-2">
                      {c.mode === 'live' ? 'Live class' : 'Self-paced'}
                    </span>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-brand-700">{c.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{c.shortDescription || c.description}</p>
                    <span className="font-bold text-brand-700">
                      {formatMoney(c.priceCents, c.currency || 'USD')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-gradient-to-br from-brand-800 to-brand-950 text-white">
        <div className="max-w-7xl mx-auto container-px py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-4xl font-bold mb-4">{service.cta.heading}</h2>
            <p className="text-brand-50/90 text-lg leading-relaxed">{service.cta.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact" className="btn btn-accent">
                Get started <Icon name="arrow-right" size={16} />
              </Link>
              <Link to="/signup" className="btn btn-white">Create an account</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
