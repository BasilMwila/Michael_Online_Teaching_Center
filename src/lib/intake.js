// The registration questions asked on the campaign landing form (/register).
//
// The wording lives here rather than in the page so the admin screens label the
// stored answers with exactly the question that produced them. Adding a question
// means adding it to the form, to `buildIntake` and to `intakeRows` — nothing
// else reads these values by hand.

/** "Returning Student/ First time student" */
export const STUDENT_TYPES = ['First-time student', 'Returning student'];

/** "How did you hear about us" */
export const HEAR_ABOUT_OPTIONS = [
  'Facebook',
  'Instagram',
  'WhatsApp',
  'TikTok',
  'LinkedIn',
  'YouTube',
  'X (Twitter)',
  'Google search',
  'Friend or family',
  'Former student',
  'Flyer or poster',
  'Radio or TV',
  'At an event',
  'Other'
];

/**
 * Channels an admin can tag a campaign link with, as `?src=`.
 *
 * Every label here is also a `HEAR_ABOUT_OPTIONS` entry, so a tagged link can
 * pre-answer the question for the visitor — and the untagged answer still gets
 * recorded if they change it, which is the more honest number of the two.
 */
export const CAMPAIGN_SOURCES = [
  'Facebook',
  'Instagram',
  'WhatsApp',
  'TikTok',
  'LinkedIn',
  'YouTube',
  'X (Twitter)',
  'Flyer or poster'
];

export const slugifySource = (label) =>
  String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** The channel label for a `?src=` slug, or '' if it is not one of ours. */
export function sourceFromSlug(slug) {
  const wanted = slugifySource(slug);
  if (!wanted) return '';
  return CAMPAIGN_SOURCES.find((s) => slugifySource(s) === wanted) || '';
}

/**
 * The answers as they are stored on the user's profile, under `intake`.
 * `submittedAt` is added by the caller so this stays a plain, testable object.
 *
 * `link` is the admin's registration link they arrived through, if any. Who
 * referred them is copied in rather than left as a lookup, so the credit
 * survives the link being turned off or deleted.
 */
export function buildIntake(form, { campaignSource = '', link = null, custom = [] } = {}) {
  const trim = (v) => String(v || '').trim();
  return {
    ref: link?.code || '',
    referrerId: link?.ownerId || '',
    referrerName: link?.ownerName || '',
    // Answers to the extra questions this link asked, stored with their
    // question text so they can be read back without the link.
    custom: custom || [],
    occupation: trim(form.occupation),
    professionalArea: trim(form.professionalArea),
    otherInterests: (form.otherInterests || []).filter(Boolean),
    otherInterestsNote: trim(form.otherInterestsNote),
    studentType: trim(form.studentType),
    heardAbout: trim(form.heardAbout),
    // Only meaningful when they picked "Other"; kept separate so the main
    // answer stays countable.
    heardAboutNote: form.heardAbout === 'Other' ? trim(form.heardAboutNote) : '',
    campaignSource: trim(campaignSource)
  };
}

/** Question-and-answer pairs for the admin screens. Unanswered ones are dropped. */
export function intakeRows(intake) {
  if (!intake) return [];
  const interests = [
    ...(intake.otherInterests || []),
    intake.otherInterestsNote
  ].filter(Boolean).join(', ');

  const heard = intake.heardAbout === 'Other' && intake.heardAboutNote
    ? `Other — ${intake.heardAboutNote}`
    : intake.heardAbout;

  const referred = intake.referrerName && intake.ref
    ? `${intake.referrerName} (${intake.ref})`
    : intake.referrerName || intake.ref;

  // The link's own questions come after the standard ones, in the order asked.
  const extra = (intake.custom || [])
    .filter((c) => c && c.label && c.value)
    .map((c) => [c.label, c.value]);

  return [
    ['Current occupation', intake.occupation],
    ['Professional area of study', intake.professionalArea],
    ['Other areas of interest', interests],
    ['Student', intake.studentType],
    ['Heard about us via', heard],
    ['Registered through', referred],
    ['Campaign link', intake.campaignSource],
    ...extra
  ].filter(([, value]) => !!value);
}
