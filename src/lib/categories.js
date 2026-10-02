// The services Empire Skills Academy offers. Used for course and live-session
// categories so the catalogue filters stay consistent instead of drifting with
// free-typed values.
export const SERVICE_CATEGORIES = [
  'Courses',
  'IELTS/PTE',
  'CV Design/Revamp',
  'Learn How To Teach Online'
];

/**
 * Each service gets its own tab in the main navigation.
 * `navLabel` is the shortened wording used in the bar so eight tabs still fit;
 * the full category name is what shows on the page itself.
 * "Courses" is unfiltered so the full catalogue stays reachable.
 */
export const SERVICE_NAV = [
  { category: 'Courses', navLabel: 'Courses', to: '/courses' },
  { category: 'IELTS/PTE', navLabel: 'IELTS/PTE', to: '/courses?category=IELTS%2FPTE' },
  { category: 'CV Design/Revamp', navLabel: 'CV Design', to: '/courses?category=CV%20Design%2FRevamp' },
  { category: 'Learn How To Teach Online', navLabel: 'Teach Online', to: '/courses?category=Learn%20How%20To%20Teach%20Online' }
];

/** Sub-heading shown when a service tab opens the catalogue filtered. */
export const SERVICE_BLURBS = {
  'Courses': 'Self-paced and instructor-led programmes with lesson notes, narration and a quiz to pass before moving on.',
  'IELTS/PTE': 'Preparation for the IELTS and PTE English tests, including UKVI, built around the band score you need.',
  'CV Design/Revamp': 'Have your CV rewritten and redesigned so your experience reads clearly to recruiters.',
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
