import {
  collection, getDocs, addDoc, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';

export function scoreQuiz(quiz, answers) {
  if (!quiz?.questions?.length) return { correct: 0, total: 0, percent: 0, passed: false };
  let correct = 0;
  quiz.questions.forEach((q, i) => {
    if (answers[i] !== undefined && Number(answers[i]) === Number(q.correctOptionIndex)) correct++;
  });
  const total = quiz.questions.length;
  const percent = Math.round((correct / total) * 100);
  const passed = percent >= (quiz.passScore || 70);
  return { correct, total, percent, passed };
}

export async function submitQuizAttempt({ userId, quizId, courseId, lessonId, answers, result }) {
  const ref = await addDoc(collection(db, 'quizAttempts'), {
    userId,
    quizId,
    courseId,
    lessonId,
    answers,
    score: result.percent,
    correct: result.correct,
    total: result.total,
    passed: result.passed,
    attemptedAt: serverTimestamp()
  });
  return ref.id;
}

export async function listMyAttempts(userId, courseId) {
  const q = query(
    collection(db, 'quizAttempts'),
    where('userId', '==', userId),
    where('courseId', '==', courseId),
    orderBy('attemptedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
