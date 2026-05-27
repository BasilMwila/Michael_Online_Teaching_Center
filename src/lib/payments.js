import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { uploadToCloudinary } from './cloudinary.js';
import { activateEnrollment } from './enrollments.js';

export async function submitPayment({
  userId, studentId, courseId, courseTitle, enrollmentId,
  amountCents, currency, bankReference, depositorName, depositDate, proofFile
}) {
  let proofUrl = '';
  if (proofFile) {
    const { url } = await uploadToCloudinary(proofFile, {
      folder: `paymentProofs/${userId}`,
      resourceType: 'auto'
    });
    proofUrl = url;
  }
  const docRef = await addDoc(collection(db, 'payments'), {
    userId,
    studentId,
    courseId,
    courseTitle,
    enrollmentId,
    amountCents,
    currency,
    method: 'bank_transfer',
    bankReference: bankReference || '',
    depositorName: depositorName || '',
    depositDate: depositDate || '',
    proofUrl,
    status: 'pending',
    submittedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function listMyPayments(userId) {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    orderBy('submittedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listPendingPayments() {
  const q = query(
    collection(db, 'payments'),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllPayments() {
  const q = query(collection(db, 'payments'), orderBy('submittedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function confirmPayment(payment, adminUid) {
  await updateDoc(doc(db, 'payments', payment.id), {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
    confirmedBy: adminUid
  });
  if (payment.enrollmentId) {
    await activateEnrollment(payment.enrollmentId);
  }
}

export async function rejectPayment(paymentId, adminUid, reason) {
  await updateDoc(doc(db, 'payments', paymentId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
    confirmedBy: adminUid,
    rejectionReason: reason || ''
  });
}
