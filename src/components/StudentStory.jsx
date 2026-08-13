import Icon from './Icon.jsx';

function Portrait({ story, size = 'md' }) {
  const dims = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  return (
    <div className={`${dims} rounded-2xl overflow-hidden flex-shrink-0 bg-brand-100 ring-2 ring-accent-500/40`}>
      <img
        src={story.photo}
        alt={story.name}
        loading="lazy"
        className={`w-full h-full ${story.photoFit === 'contain' ? 'object-contain bg-white' : 'object-cover'}`}
      />
    </div>
  );
}

function CourseChips({ courses }) {
  if (!courses?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {courses.map((c) => (
        <span key={c} className="badge bg-brand-50 text-brand-700 border border-brand-100">{c}</span>
      ))}
    </div>
  );
}

/** Compact card — used on the home page grid. */
export function StudentStoryCard({ story }) {
  return (
    <article className="card p-6 relative overflow-hidden flex flex-col">
      <div className="absolute -top-8 -left-1 text-[7rem] leading-none text-accent-500/15 font-display font-bold select-none pointer-events-none">
        &ldquo;
      </div>
      <div className="relative flex items-center gap-4">
        <Portrait story={story} />
        <div className="min-w-0">
          <p className="font-display font-bold text-ink-900 leading-tight">{story.name}</p>
          <p className="text-xs text-ink-500 mt-0.5">{story.role}</p>
          {story.tagline && (
            <p className="text-[11px] font-semibold text-accent-600 uppercase tracking-wide mt-1">{story.tagline}</p>
          )}
        </div>
      </div>
      <p className="relative mt-5 text-ink-700 leading-relaxed flex-1">{story.excerpt}</p>
      <div className="relative mt-5 pt-4 border-t border-ink-100">
        <CourseChips courses={story.courses} />
      </div>
    </article>
  );
}

/** Full story — used on the Testimonials page. */
export function StudentStoryFull({ story }) {
  return (
    <article className="card overflow-hidden">
      <div className="h-1.5 flex" aria-hidden="true">
        <div className="w-[78%] bg-accent-500" />
        <div className="flex-1 bg-brand-900" />
      </div>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Portrait story={story} size="lg" />
          <div>
            {story.tagline && (
              <p className="text-xs font-semibold text-accent-600 uppercase tracking-wider">{story.tagline}</p>
            )}
            <h3 className="mt-1 text-2xl font-display font-bold text-ink-900">{story.name}</h3>
            <p className="text-sm text-ink-600">{story.role}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {story.paragraphs?.map((p, i) => (
            <p key={i} className={`leading-relaxed ${story.type === 'quote' ? 'text-ink-800 italic' : 'text-ink-700'}`}>
              {story.type === 'quote' && i === 0 ? `“${p}` : p}
              {story.type === 'quote' && i === story.paragraphs.length - 1 ? '”' : ''}
            </p>
          ))}
        </div>

        {story.outcomes?.length > 0 && (
          <ul className="mt-6 space-y-2.5">
            {story.outcomes.map((o) => (
              <li key={o} className="flex gap-3 text-ink-700 leading-relaxed">
                <Icon name="check" size={18} className="text-accent-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-7 pt-5 border-t border-ink-100">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2.5">Studied with us</p>
          <CourseChips courses={story.courses} />
        </div>
      </div>
    </article>
  );
}

/** Portrait-orientation video testimonial. */
export function VideoStory({ story, autoPlay = false }) {
  return (
    <figure className="flex flex-col items-center">
      <div className="relative w-full max-w-[280px]">
        <div className="absolute -inset-2.5 rounded-[2.5rem] bg-gradient-to-br from-accent-400/40 via-transparent to-brand-400/30 blur-xl" />
        <video
          src={story.src}
          poster={story.poster}
          className="relative w-full rounded-[2rem] border-4 border-white/10 shadow-lift bg-black"
          controls
          muted={autoPlay}
          autoPlay={autoPlay}
          loop={autoPlay}
          playsInline
          preload="metadata"
        />
      </div>
      <figcaption className="mt-5 text-center max-w-xs">
        <p className="font-display font-semibold text-white">{story.title}</p>
        <p className="mt-1.5 text-sm text-ink-300 leading-relaxed">{story.blurb}</p>
      </figcaption>
    </figure>
  );
}
