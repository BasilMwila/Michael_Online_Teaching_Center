import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { uploadToCloudinary } from './cloudinary.js';
import { apiGet, apiPost } from './apiClient.js';
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

/**
 * Start a mobile money charge. The server talks to Lenco (the secret key never
 * reaches the browser) and the student then approves the prompt on their phone.
 */
export function startMobileMoneyPayment({ amountCents, phone, operator, enrollmentId, courseId, courseTitle, currency }) {
  // The server converts to Kwacha with a live rate — we never send the amount
  // to charge, only the course price and its currency.
  return apiPost('/payments/mobile-money/initiate', {
    amountCents, phone, operator, enrollmentId, courseId, courseTitle, currency
  });
}

/** Ask the server where a mobile money charge has got to. */
export function getMobileMoneyStatus(reference) {
  return apiGet(`/payments/mobile-money/${encodeURIComponent(reference)}`, { auth: true });
}

/** Whether the server has mobile money switched on. */
export function getMobileMoneyConfig() {
  return apiGet('/payments/mobile-money/status');
}

/**
 * Record a completed mobile money payment for the admin to see.
 * The money itself is already verified server-side against Lenco; this is the
 * student-visible record that drives the existing confirmation flow.
 */
export async function recordMobileMoneyPayment({
  userId, studentId, courseId, courseTitle, enrollmentId,
  amountCents, currency, reference, phone, operator
}) {
  const docRef = await addDoc(collection(db, 'payments'), {
    userId,
    studentId,
    courseId,
    courseTitle,
    enrollmentId,
    amountCents,
    currency,
    method: 'mobile_money',
    lencoReference: reference,
    lencoVerified: true,
    bankReference: reference,
    depositorName: phone || '',
    depositDate: new Date().toISOString().slice(0, 10),
    mobileOperator: operator || '',
    proofUrl: '',
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
