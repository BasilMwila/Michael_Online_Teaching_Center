import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { normalizeFields } from './formFields.js';

/**
 * A registration link that belongs to the admin who generated it.
 *
 * Each one is a document whose id IS the code in the URL, so resolving a link
 * is a single lookup by path and needs no query — which also means the rules
 * can allow a visitor to read it. The channel and the course live on the
 * document rather than in the URL, so the link stays short enough to put in a
 * post or read out loud.
 *
 * Nothing here grants access to anything. The code is attribution only: it
 * records which admin's post a registration came from.
 */

/** No 0/O or 1/I/L — these codes get typed by hand and read off screenshots. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 7;

function randomCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  // Modulo bias over a 31-letter alphabet is negligible here: the code only has
  // to be unguessable enough that nobody stumbles onto someone else's.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** The public URL for a code. Short on purpose — it goes in social posts. */
export function registrationLinkUrl(code, origin = window.location.origin) {
  return `${origin}/r/${code}`;
}

export async function getRegistrationLink(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return null;
  const snap = await getDoc(doc(db, 'registrationLinks', clean));
  return snap.exists() ? { code: snap.id, ...snap.data() } : null;
}

/**
 * Generate a link owned by this admin. Retries on the (vanishingly unlikely)
 * chance of a code collision rather than silently overwriting someone's link.
 */
export async function createRegistrationLink({ ownerId, ownerName, channel = '', courseId = '', courseTitle = '', fields = [] }) {
  if (!ownerId) throw new Error('A registration link needs an owner.');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const ref = doc(db, 'registrationLinks', code);
    if ((await getDoc(ref)).exists()) continue;

    const link = {
      ownerId,
      // Denormalised so the registration form can say who invited the visitor
      // without reading the admin's profile, which visitors cannot see.
      ownerName: ownerName || '',
      channel,
      courseId,
      courseTitle,
      // Extra questions this particular link should ask, on top of the
      // standard ones every registration form has.
      fields: normalizeFields(fields),
      active: true,
      createdAt: serverTimestamp()
    };
    await setDoc(ref, link);
    return { code, ...link };
  }
  throw new Error('Could not generate a unique code. Please try again.');
}

/**
 * Filtered in the browser rather than with `where('ownerId', ...)`, which
 * combined with the ordering would need a composite index — a deploy of its
 * own, and a query that fails outright until the index finishes building.
 * There are only ever a handful of these documents.
 */
export async function listMyRegistrationLinks(ownerId) {
  const all = await listAllRegistrationLinks();
  return all.filter((l) => l.ownerId === ownerId);
}

export async function listAllRegistrationLinks() {
  const q = query(collection(db, 'registrationLinks'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ code: d.id, ...d.data() }));
}

/** Turning a link off leaves it resolvable, so old posts still register people —
 *  they just stop being credited to the admin. */
export async function setLinkActive(code, active) {
  await updateDoc(doc(db, 'registrationLinks', code), { active: !!active });
}

export async function deleteRegistrationLink(code) {
  await deleteDoc(doc(db, 'registrationLinks', code));
}

/**
 * How many people each code brought in, counted from the profiles themselves
 * rather than a counter on the link. A counter would need an unauthenticated
 * write — which anyone could then inflate — and would drift if a link were
 * ever deleted and the code reused.
 */
export function countRegistrationsByCode(users) {
  const counts = {};
  for (const u of users || []) {
    const code = u.intake?.ref;
    if (code) counts[code] = (counts[code] || 0) + 1;
  }
  return counts;
}
