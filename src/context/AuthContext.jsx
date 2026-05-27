import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

const AuthContext = createContext(null);

const STUDENT_ID_PREFIX = 'EST';

async function issueStudentId() {
  const counterRef = doc(db, 'counters', 'students');
  const year = new Date().getFullYear();
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().count || 0) : 0;
    const updated = current + 1;
    tx.set(counterRef, { count: updated, updatedAt: serverTimestamp() }, { merge: true });
    return updated;
  });
  return `${STUDENT_ID_PREFIX}-${year}-${String(next).padStart(5, '0')}`;
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        setProfile(snap.exists() ? { uid: fbUser.uid, ...snap.data() } : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signup({ email, password, fullName, phone, subscribeUpdates }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    const studentId = await issueStudentId();
    const userDoc = {
      email,
      fullName,
      phone: phone || '',
      studentId,
      role: 'student',
      subscribedToUpdates: !!subscribeUpdates,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', cred.user.uid), userDoc);
    setProfile({ uid: cred.user.uid, ...userDoc });
    return { uid: cred.user.uid, studentId };
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  const value = {
    firebaseUser,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signup,
    login,
    logout,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
