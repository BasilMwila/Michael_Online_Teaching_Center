import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, runTransaction, serverTimestamp, increment
} from 'firebase/firestore';
import { db } from '../firebase.js';

export async function bookSession({ userId, studentId, fullName, session, topicCategory, notes }) {
  const sessionRef = doc(db, 'liveSessions', session.id);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) throw new Error('Session not found');
    const data = snap.data();
    if (data.status === 'cancelled') throw new Error('Session was cancelled');
    if (data.status === 'full' || (data.capacity && data.bookedCount >= data.capacity)) {
      throw new Error('Session is full');
    }
    const newCount = (data.bookedCount || 0) + 1;
    const updates = { bookedCount: increment(1) };
    if (data.capacity && newCount >= data.capacity) updates.status = 'full';
    tx.update(sessionRef, updates);

    const bookingRef = doc(collection(db, 'bookings'));
    tx.set(bookingRef, {
      userId,
      studentId,
      fullName,
      sessionId: session.id,
      sessionTopic: session.topic,
      sessionStartTime: session.startTime,
      sessionType: session.type,
      topicCategory: topicCategory || session.category || '',
      notes: notes || '',
      status: session.priceCents > 0 ? 'pending_payment' : 'confirmed',
      priceCents: session.priceCents || 0,
      currency: session.currency || 'USD',
      createdAt: serverTimestamp()
    });
    return bookingRef.id;
  });
}

export async function listMyBookings(userId) {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listBookingsForSession(sessionId) {
  const q = query(collection(db, 'bookings'), where('sessionId', '==', sessionId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateBookingStatus(bookingId, status) {
  await updateDoc(doc(db, 'bookings', bookingId), { status, updatedAt: serverTimestamp() });
}

export async function cancelBooking(booking) {
  await runTransaction(db, async (tx) => {
    const bookingRef = doc(db, 'bookings', booking.id);
    const sessionRef = doc(db, 'liveSessions', booking.sessionId);
    const sessSnap = await tx.get(sessionRef);
    tx.update(bookingRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
    if (sessSnap.exists()) {
      const data = sessSnap.data();
      const newCount = Math.max(0, (data.bookedCount || 1) - 1);
      const updates = { bookedCount: newCount };
      if (data.status === 'full' && (!data.capacity || newCount < data.capacity)) updates.status = 'open';
      tx.update(sessionRef, updates);
    }
  });
}
