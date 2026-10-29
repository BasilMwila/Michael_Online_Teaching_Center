import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { listAllCourses, listLessons, refreshCourseOutline } from './courses.js';
import { listAllEnrollments } from './enrollments.js';

/**
 * One tiny admin-written record per (student, course). Security rules read it
 * to decide whether a lesson or quiz document may be fetched at all.
 *
 * This is what actually keeps unpaid accounts out of the course content. The
 * screens cannot do it on their own: the browser talks to Firestore directly,
 * so anything a signed-in account is allowed to read, it can read — lock icon
 * or not. The id is derived from the two ids rather than auto-generated,
 * because rules can look a document up by path but cannot run a query.
 */
export const accessId = (userId, courseId) => `${userId}_${courseId}`;

/** Called when an admin confirms a payment. */
export async function grantCourseAccess(userId, courseId, enrollmentId = '') {
  if (!userId || !courseId) return;
  await setDoc(doc(db, 'courseAccess', accessId(userId, courseId)), {
    userId,
    courseId,
    enrollmentId,
    grantedAt: serverTimestamp()
  });
}

/** Take access back — the enrollment record and its progress are left alone. */
export async function revokeCourseAccess(userId, courseId) {
  if (!userId || !courseId) return;
  await deleteDoc(doc(db, 'courseAccess', accessId(userId, courseId)));
}

export async function hasCourseAccess(userId, courseId) {
  if (!userId || !courseId) return false;
  const snap = await getDoc(doc(db, 'courseAccess', accessId(userId, courseId)));
  return snap.exists();
}

/** Statuses that should be able to open the lessons. */
const ENTITLED = ['active', 'completed'];

/**
 * What still needs backfilling before the rules can be tightened:
 * every student already studying needs an access record, and every course
 * needs its public outline, or non-enrolled visitors lose the curriculum list.
 */
export async function auditAccess() {
  const [enrollments, courses] = await Promise.all([listAllEnrollments(), listAllCourses()]);
  const entitled = enrollments.filter((e) => ENTITLED.includes(e.status));

  const existing = new Set(
    (await getDocs(collection(db, 'courseAccess'))).docs.map((d) => d.id)
  );
  const missingAccess = entitled.filter((e) => !existing.has(accessId(e.userId, e.courseId)));
  const missingOutline = courses.filter((c) => !Array.isArray(c.outline));

  return {
    entitled: entitled.length,
    alreadyGranted: entitled.length - missingAccess.length,
    missingAccess,
    missingOutline,
    ready: missingAccess.length === 0 && missingOutline.length === 0
  };
}

/**
 * Give every already-active student their access record and build the public
 * outline for every course. Idempotent: re-running it changes nothing.
 * Must be run BEFORE the tightened rules are published, or students who have
 * already paid would lose the lessons they are part-way through.
 */
export async function runAccessBackfill(onProgress) {
  const audit = await auditAccess();
  let done = 0;
  const total = audit.missingAccess.length + audit.missingOutline.length;
  const step = (label) => onProgress?.({ done: ++done, total, label });

  // Access records go in batches — far fewer round trips than one at a time.
  for (let i = 0; i < audit.missingAccess.length; i += 400) {
    const slice = audit.missingAccess.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const e of slice) {
      batch.set(doc(db, 'courseAccess', accessId(e.userId, e.courseId)), {
        userId: e.userId,
        courseId: e.courseId,
        enrollmentId: e.id,
        grantedAt: serverTimestamp(),
        backfilled: true
      });
    }
    await batch.commit();
    slice.forEach(() => step('access records'));
  }

  for (const c of audit.missingOutline) {
    await refreshCourseOutline(c.id);
    step(`outline: ${c.title || c.id}`);
  }

  return { granted: audit.missingAccess.length, outlines: audit.missingOutline.length };
}

/** Lessons for a course the caller is known to hold access to. */
export const lessonsForEntitled = listLessons;
