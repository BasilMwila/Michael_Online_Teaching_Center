import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
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
        const ref = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile({ uid: fbUser.uid, ...snap.data() });
        } else {
          // An auth account with no profile (e.g. created outside the signup
          // form) would otherwise be stuck on a permanent loading spinner.
          const created = {
            email: fbUser.email || '',
            fullName: fbUser.displayName || '',
            phone: '',
            studentId: await issueStudentId().catch(() => ''),
            role: 'student',
            subscribedToUpdates: false,
            createdAt: serverTimestamp()
          };
          try {
            await setDoc(ref, created);
            setProfile({ uid: fbUser.uid, ...created });
          } catch {
            setProfile(null);
          }
        }
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

  /**
   * Change the signed-in user's password. Firebase requires a recent sign-in
   * for this, so we reauthenticate with the current password first — which
   * doubles as a check that the person at the keyboard is the account holder.
   */
  async function changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw new Error('You are not signed in.');

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);

    // Clear the first-login flag so the prompt stops appearing.
    if (profile?.mustChangePassword) {
      await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false });
      setProfile((p) => ({ ...p, mustChangePassword: false }));
    }
  }

  const value = {
    firebaseUser,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    mustChangePassword: !!profile?.mustChangePassword,
    signup,
    login,
    logout,
    resetPassword,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
