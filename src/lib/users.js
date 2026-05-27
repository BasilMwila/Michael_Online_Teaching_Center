import {
  collection, doc, getDocs, updateDoc, addDoc, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';

export async function listAllUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function subscribeToNewsletter(email) {
  const q = query(collection(db, 'subscribers'), where('email', '==', email));
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(collection(db, 'subscribers'), {
    email,
    subscribedAt: serverTimestamp()
  });
  return ref.id;
}

export async function addWhatsappGroupMember({ userId, studentId, fullName, sessionId, courseId, groupName, groupUrl, addedBy }) {
  const ref = await addDoc(collection(db, 'whatsappGroupMembers'), {
    userId,
    studentId,
    fullName,
    sessionId: sessionId || null,
    courseId: courseId || null,
    groupName: groupName || '',
    groupUrl: groupUrl || '',
    addedBy,
    addedAt: serverTimestamp()
  });
  return ref.id;
}

export async function listMyWhatsappGroups(userId) {
  const q = query(collection(db, 'whatsappGroupMembers'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
