import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';

export async function listUpcomingSessions() {
  const now = new Date();
  const q = query(collection(db, 'liveSessions'), orderBy('startTime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.startTime?.toDate?.() >= now && s.status !== 'cancelled');
}

export async function listAllSessions() {
  const q = query(collection(db, 'liveSessions'), orderBy('startTime', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getSession(sessionId) {
  const snap = await getDoc(doc(db, 'liveSessions', sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createSession(data) {
  const ref = await addDoc(collection(db, 'liveSessions'), {
    ...data,
    bookedCount: 0,
    status: data.status || 'open',
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateSession(sessionId, data) {
  await updateDoc(doc(db, 'liveSessions', sessionId), data);
}

export async function deleteSession(sessionId) {
  await deleteDoc(doc(db, 'liveSessions', sessionId));
}
