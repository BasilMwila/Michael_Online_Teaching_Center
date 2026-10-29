import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';

export async function listPublishedCourses() {
  const q = query(collection(db, 'courses'), where('isPublished', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllCourses() {
  const snap = await getDocs(collection(db, 'courses'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCourse(courseId) {
  const snap = await getDoc(doc(db, 'courses', courseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createCourse(data) {
  const ref = await addDoc(collection(db, 'courses'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateCourse(courseId, data) {
  await updateDoc(doc(db, 'courses', courseId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCourse(courseId) {
  await deleteDoc(doc(db, 'courses', courseId));
}

export async function listLessons(courseId) {
  const q = query(collection(db, 'courses', courseId, 'lessons'), orderBy('orderIndex', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getLesson(courseId, lessonId) {
  const snap = await getDoc(doc(db, 'courses', courseId, 'lessons', lessonId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * A public, lightweight table of contents stored on the course itself: titles
 * and durations only, no notes, no video, no quiz. Lesson documents are locked
 * to students who have been granted access, so this is what lets a visitor
 * still see what a course covers before they enrol.
 */
export async function refreshCourseOutline(courseId) {
  const lessons = await listLessons(courseId);
  await updateDoc(doc(db, 'courses', courseId), {
    outline: lessons.map((l) => ({
      title: l.title || '',
      durationMinutes: l.durationMinutes || 0
    })),
    lessonCount: lessons.length
  });
}

// Bulk importers pass refreshOutline:false and rebuild once at the end, rather
// than re-reading every lesson after each one.
export async function createLesson(courseId, data, { refreshOutline = true } = {}) {
  const ref = await addDoc(collection(db, 'courses', courseId, 'lessons'), {
    ...data,
    createdAt: serverTimestamp()
  });
  if (refreshOutline) await refreshCourseOutline(courseId);
  return ref.id;
}

export async function updateLesson(courseId, lessonId, data, { refreshOutline = true } = {}) {
  await updateDoc(doc(db, 'courses', courseId, 'lessons', lessonId), data);
  if (refreshOutline) await refreshCourseOutline(courseId);
}

export async function deleteLesson(courseId, lessonId, { refreshOutline = true } = {}) {
  await deleteDoc(doc(db, 'courses', courseId, 'lessons', lessonId));
  if (refreshOutline) await refreshCourseOutline(courseId);
}

/** All quizzes for a course, keyed by lessonId — avoids a read per lesson. */
export async function listQuizzesByLesson(courseId) {
  const snap = await getDocs(collection(db, 'courses', courseId, 'quizzes'));
  const map = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.lessonId) map[data.lessonId] = { id: d.id, ...data };
  });
  return map;
}

export async function getQuiz(courseId, lessonId) {
  const snap = await getDocs(collection(db, 'courses', courseId, 'quizzes'));
  const match = snap.docs.find((d) => d.data().lessonId === lessonId);
  return match ? { id: match.id, ...match.data() } : null;
}

export async function upsertQuiz(courseId, lessonId, data) {
  const existing = await getQuiz(courseId, lessonId);
  if (existing) {
    await updateDoc(doc(db, 'courses', courseId, 'quizzes', existing.id), data);
    return existing.id;
  }
  const ref = await addDoc(collection(db, 'courses', courseId, 'quizzes'), {
    ...data, lessonId, createdAt: serverTimestamp()
  });
  return ref.id;
}

/**
 * True for links that point straight at a video file (e.g. an mp4 exported
 * from SlideSpeak, or a Cloudinary upload) rather than a page to embed.
 * These play in a native <video> element; everything else goes in an iframe.
 */
export function isDirectVideoUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const u = new URL(rawUrl);
    if (/\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(u.pathname)) return true;
    // Cloudinary video delivery URLs, including transformed ones.
    if (u.hostname.includes('res.cloudinary.com') && u.pathname.includes('/video/')) return true;
    return false;
  } catch {
    return false;
  }
}

export function youtubeEmbedUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith('/embed/')) return rawUrl;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch { /* fall through */ }
  return rawUrl;
}
