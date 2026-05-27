import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase.js';

export async function listMyEnrollments(userId) {
  const q = query(
    collection(db, 'enrollments'),
    where('userId', '==', userId),
    orderBy('enrolledAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEnrollmentForCourse(userId, courseId) {
  const q = query(
    collection(db, 'enrollments'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function applyForCourse({ userId, courseId, courseTitle, courseMode, priceCents, currency }) {
  const existing = await getEnrollmentForCourse(userId, courseId);
  if (existing) return existing.id;
  const ref = await addDoc(collection(db, 'enrollments'), {
    userId,
    courseId,
    courseTitle,
    courseMode,
    priceCents,
    currency,
    status: 'pending_payment',
    progressPercent: 0,
    completedLessons: [],
    enrolledAt: serverTimestamp()
  });
  return ref.id;
}

export async function markLessonCompleted(enrollmentId, lessonId, totalLessons) {
  const ref = doc(db, 'enrollments', enrollmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const completed = snap.data().completedLessons || [];
  if (completed.includes(lessonId)) return;
  const newList = [...completed, lessonId];
  const progress = totalLessons > 0 ? Math.round((newList.length / totalLessons) * 100) : 0;
  await updateDoc(ref, {
    completedLessons: arrayUnion(lessonId),
    progressPercent: progress,
    lastAccessedAt: serverTimestamp()
  });
}

export async function listAllEnrollmentsForCourse(courseId) {
  const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function activateEnrollment(enrollmentId) {
  await updateDoc(doc(db, 'enrollments', enrollmentId), {
    status: 'active',
    activatedAt: serverTimestamp()
  });
}
