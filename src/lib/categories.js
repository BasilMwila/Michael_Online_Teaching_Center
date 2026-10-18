// The services Empire Skills Academy offers. Used for course and live-session
// categories so the catalogue filters stay consistent instead of drifting with
// free-typed values.
export const SERVICE_CATEGORIES = [
  'Courses',
  'IELTS/PTE',
  'CV Clinic',
  'Learn How To Teach Online'
];

/**
 * Categories that have been renamed. Courses saved under the old name are still
 * in the database, so both names have to resolve to the same service rather
 * than the old ones quietly vanishing from the catalogue.
 */
export const CATEGORY_ALIASES = {
  'CV Design/Revamp': 'CV Clinic',
  'CV Design': 'CV Clinic'
};

/** The current name for a stored category value. */
export function canonicalCategory(value) {
  const name = String(value || '').trim();
  return CATEGORY_ALIASES[name] || name;
}

/** Does a stored category belong to this service, under either name? */
export function matchesCategory(stored, service) {
  return canonicalCategory(stored) === canonicalCategory(service);
}

/**
 * Each service gets its own tab in the main navigation.
 * `navLabel` is the shortened wording used in the bar so eight tabs still fit.
 * The three specialist services have their own page; "Courses" stays on the
 * catalogue so the full list remains reachable.
 */
export const SERVICE_NAV = [
  { category: 'Courses', navLabel: 'Courses', to: '/courses' },
  { category: 'IELTS/PTE', navLabel: 'IELTS/PTE', to: '/ielts-pte' },
  { category: 'CV Clinic', navLabel: 'CV Clinic', to: '/cv-clinic' },
  { category: 'Learn How To Teach Online', navLabel: 'Teach Online', to: '/teach-online' }
];

/** Sub-heading shown when a service tab opens the catalogue filtered. */
export const SERVICE_BLURBS = {
  'Courses': 'Self-paced and instructor-led programmes with lesson notes, narration and a quiz to pass before moving on.',
  'IELTS/PTE': 'Preparation for the IELTS and PTE English tests, including UKVI, built around the band score you need.',
  'CV Clinic': 'Professional CV writing, LinkedIn optimisation and job-search support for every career stage.',
  'Learn How To Teach Online': 'Training for teachers and professionals moving their teaching online.'
};

/**
 * Options for a category <select>. Keeps any value already saved on a record
 * even if it predates this list, so editing an old item never silently
 * discards its category.
 */
export function categoryOptions(current) {
  const value = String(current || '').trim();
  if (value && !SERVICE_CATEGORIES.includes(value)) {
    return [...SERVICE_CATEGORIES, value];
  }
  return SERVICE_CATEGORIES;
}
