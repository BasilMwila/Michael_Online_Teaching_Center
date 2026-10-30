// Extra questions an admin can attach to one registration link.
//
// The standard questions (name, email, phone, occupation and so on) are the
// same on every link. These are the ones that only make sense for a particular
// campaign — "which intake do you want?", "do you already have a laptop?" —
// so they live on the link rather than in the form's own code.

export const MAX_FIELDS = 10;
export const MAX_OPTIONS = 12;
export const MAX_LABEL = 120;

export const FIELD_TYPES = [
  { value: 'text', label: 'Short answer' },
  { value: 'textarea', label: 'Paragraph' },
  { value: 'select', label: 'Choose from a list' },
  { value: 'checkbox', label: 'Tick box (yes / no)' }
];

const newId = () => Math.random().toString(36).slice(2, 9);

export const blankField = () => ({
  id: newId(),
  label: '',
  type: 'text',
  required: false,
  options: []
});

/**
 * What actually gets written to the link. Unlabelled questions are dropped
 * rather than saved blank, and a list with no options is demoted to a short
 * answer so it can never render as an empty dropdown.
 */
export function normalizeFields(fields) {
  return (fields || [])
    .slice(0, MAX_FIELDS)
    .map((f) => {
      const options = (f.options || [])
        .map((o) => String(o || '').trim())
        .filter(Boolean)
        .slice(0, MAX_OPTIONS);
      const type = f.type === 'select' && options.length === 0 ? 'text' : f.type;
      return {
        id: f.id || newId(),
        label: String(f.label || '').trim().slice(0, MAX_LABEL),
        type: FIELD_TYPES.some((t) => t.value === type) ? type : 'text',
        required: !!f.required,
        options: type === 'select' ? options : []
      };
    })
    .filter((f) => f.label);
}

/** Why the admin cannot save yet, or '' when the questions are fine. */
export function describeFieldProblem(fields) {
  const list = fields || [];
  if (list.length > MAX_FIELDS) return `Up to ${MAX_FIELDS} extra questions.`;
  for (const f of list) {
    const label = String(f.label || '').trim();
    // A half-built question is a mistake worth naming, but one the admin may
    // simply not have finished typing — so only a filled-in type with no
    // label, or a list with no options, counts as a problem.
    if (!label && (f.options || []).some((o) => String(o || '').trim())) {
      return 'One of your questions has answers but no question text.';
    }
    if (label && f.type === 'select' && !(f.options || []).some((o) => String(o || '').trim())) {
      return `"${label}" is a list but has no answers to choose from.`;
    }
  }
  return '';
}

/** A blank starting value for each question, for the form's state. */
export function blankAnswers(fields) {
  const out = {};
  for (const f of fields || []) out[f.id] = f.type === 'checkbox' ? false : '';
  return out;
}

/** The first unanswered required question, or null. */
export function firstMissingAnswer(fields, answers) {
  for (const f of fields || []) {
    if (!f.required) continue;
    const value = answers?.[f.id];
    const empty = f.type === 'checkbox' ? !value : !String(value || '').trim();
    if (empty) return f;
  }
  return null;
}

/**
 * The answers as stored on the student's profile: question text alongside the
 * answer, so the admin screens can show them without having to find the link
 * they came from — which may since have been changed or deleted.
 */
export function collectCustomAnswers(fields, answers) {
  const out = [];
  for (const f of fields || []) {
    const raw = answers?.[f.id];
    const value = f.type === 'checkbox' ? (raw ? 'Yes' : 'No') : String(raw || '').trim();
    if (!value) continue;
    out.push({ label: f.label, value });
  }
  return out;
}
