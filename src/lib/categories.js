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
