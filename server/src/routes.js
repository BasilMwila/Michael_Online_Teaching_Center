import { Router } from 'express';
import multer from 'multer';
import { db, uid, now, tx, insert, update, remove, getById, fromRow } from './db.js';
import {
  hashPassword, checkPassword, signToken, issueStudentId,
  publicUser, requireAuth, requireAdmin
} from './auth.js';
import { requireFirebaseAdmin } from './firebaseAuth.js';
import { extractDocumentText, SUPPORTED_EXTENSIONS } from './documentText.js';
import { segmentIntoLessons, generateQuizForLesson, DEFAULT_QUIZ_QUESTIONS } from './aiLessons.js';
import { narrateLesson } from './narration.js';
import { buildLessonVideo } from './videoLesson.js';

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 25;

// Documents are held in memory only — they are read once and discarded.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 }
});

function uploadDocument(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `That file is larger than the ${MAX_UPLOAD_MB} MB limit.` });
    }
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    next();
  });
}

const r = Router();
const all = (table, sql, ...params) => db.prepare(sql).all(...params).map((row) => fromRow(table, row));
const one = (table, sql, ...params) => fromRow(table, db.prepare(sql).get(...params));

r.get('/health', (_req, res) => res.json({ ok: true, time: now() }));

// ---------- Auth ----------

r.post('/auth/signup', (req, res) => {
  const { email, password, fullName, phone, subscribeUpdates } = req.body || {};
  if (!email || !password || !fullName) return res.status(400).json({ error: 'email, password and fullName are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  const studentId = issueStudentId();
  const id = insert('users', {
    id: uid(), email, passwordHash: hashPassword(password),
    fullName, phone: phone || '', studentId,
    role: 'student', subscribedToUpdates: !!subscribeUpdates, createdAt: now()
  });
  const user = getById('users', id);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

r.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email || '');
  if (!user || !checkPassword(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(fromRow('users', user)) });
});

r.get('/auth/me', requireAuth, (req, res) => res.json(publicUser(fromRow('users', req.user))));

// ---------- Users (admin) ----------

r.get('/users', requireAdmin, (_req, res) => {
  res.json(all('users', 'SELECT * FROM users ORDER BY createdAt DESC').map(publicUser));
});

r.patch('/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body || {};
  if (!['student', 'admin'].includes(role)) return res.status(400).json({ error: 'role must be student or admin' });
  update('users', req.params.id, { role });
  res.json({ ok: true });
});

// ---------- Courses / Lessons / Quizzes ----------

r.get('/courses', (req, res) => {
  const rows = req.query.published === '1'
    ? all('courses', 'SELECT * FROM courses WHERE isPublished = 1')
    : all('courses', 'SELECT * FROM courses');
  res.json(rows);
});

r.get('/courses/:id', (req, res) => {
  const course = getById('courses', req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

r.post('/courses', requireAdmin, (req, res) => {
  const id = insert('courses', { ...req.body, id: uid(), createdAt: now(), updatedAt: now() });
  res.status(201).json(getById('courses', id));
});

r.patch('/courses/:id', requireAdmin, (req, res) => {
  update('courses', req.params.id, { ...req.body, updatedAt: now() });
  res.json(getById('courses', req.params.id));
});

r.delete('/courses/:id', requireAdmin, (req, res) => {
  remove('courses', req.params.id);
  res.json({ ok: true });
});

r.get('/courses/:id/lessons', (req, res) => {
  res.json(all('lessons', 'SELECT * FROM lessons WHERE courseId = ? ORDER BY orderIndex ASC', req.params.id));
});

r.post('/courses/:id/lessons', requireAdmin, (req, res) => {
  const id = insert('lessons', { ...req.body, id: uid(), courseId: req.params.id, createdAt: now() });
  res.status(201).json(getById('lessons', id));
});

r.patch('/courses/:courseId/lessons/:id', requireAdmin, (req, res) => {
  update('lessons', req.params.id, { ...req.body, courseId: req.params.courseId });
  res.json(getById('lessons', req.params.id));
});

r.delete('/courses/:courseId/lessons/:id', requireAdmin, (req, res) => {
  remove('lessons', req.params.id);
  res.json({ ok: true });
});

r.get('/courses/:courseId/lessons/:lessonId/quiz', (req, res) => {
  res.json(one('quizzes', 'SELECT * FROM quizzes WHERE courseId = ? AND lessonId = ?', req.params.courseId, req.params.lessonId));
});

r.put('/courses/:courseId/lessons/:lessonId/quiz', requireAdmin, (req, res) => {
  const { courseId, lessonId } = req.params;
  const existing = one('quizzes', 'SELECT * FROM quizzes WHERE courseId = ? AND lessonId = ?', courseId, lessonId);
  if (existing) {
    update('quizzes', existing.id, { ...req.body, courseId, lessonId });
    return res.json(getById('quizzes', existing.id));
  }
  const id = insert('quizzes', { ...req.body, id: uid(), courseId, lessonId, createdAt: now() });
  res.status(201).json(getById('quizzes', id));
});

// ---------- Quiz attempts (scored server-side) ----------

r.post('/quiz-attempts', requireAuth, (req, res) => {
  const { quizId, answers } = req.body || {};
  const quiz = getById('quizzes', quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  let correct = 0;
  quiz.questions.forEach((q, i) => {
    if (answers?.[i] !== undefined && Number(answers[i]) === Number(q.correctOptionIndex)) correct++;
  });
  const total = quiz.questions.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const passed = percent >= (quiz.passScore || 70);
  const id = insert('quizAttempts', {
    id: uid(), userId: req.user.id, quizId, courseId: quiz.courseId, lessonId: quiz.lessonId,
    answers: answers || [], score: percent, correct, total, passed, attemptedAt: now()
  });
  res.status(201).json(getById('quizAttempts', id));
});

r.get('/quiz-attempts', requireAuth, (req, res) => {
  const userId = req.user.role === 'admin' && req.query.userId ? req.query.userId : req.user.id;
  const rows = req.query.courseId
    ? all('quizAttempts', 'SELECT * FROM quizAttempts WHERE userId = ? AND courseId = ? ORDER BY attemptedAt DESC', userId, req.query.courseId)
    : all('quizAttempts', 'SELECT * FROM quizAttempts WHERE userId = ? ORDER BY attemptedAt DESC', userId);
  res.json(rows);
});

// ---------- Enrollments ----------

r.get('/enrollments', requireAuth, (req, res) => {
  if (req.user.role === 'admin' && req.query.courseId) {
    return res.json(all('enrollments', 'SELECT * FROM enrollments WHERE courseId = ?', req.query.courseId));
  }
  if (req.query.courseId) {
    return res.json(all('enrollments', 'SELECT * FROM enrollments WHERE userId = ? AND courseId = ?', req.user.id, req.query.courseId));
  }
  res.json(all('enrollments', 'SELECT * FROM enrollments WHERE userId = ? ORDER BY enrolledAt DESC', req.user.id));
});

r.post('/enrollments', requireAuth, (req, res) => {
  const { courseId } = req.body || {};
  const course = getById('courses', courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const existing = one('enrollments', 'SELECT * FROM enrollments WHERE userId = ? AND courseId = ?', req.user.id, courseId);
  if (existing) return res.json(existing);
  const id = insert('enrollments', {
    id: uid(), userId: req.user.id, courseId,
    courseTitle: course.title, courseMode: course.mode,
    priceCents: course.priceCents, currency: course.currency,
    status: 'pending_payment', progressPercent: 0, completedLessons: [], enrolledAt: now()
  });
  res.status(201).json(getById('enrollments', id));
});

r.post('/enrollments/:id/complete-lesson', requireAuth, (req, res) => {
  const enrollment = getById('enrollments', req.params.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (enrollment.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your enrollment' });
  const { lessonId } = req.body || {};
  if (!enrollment.completedLessons.includes(lessonId)) {
    const completed = [...enrollment.completedLessons, lessonId];
    const { n: totalLessons } = db.prepare('SELECT COUNT(*) AS n FROM lessons WHERE courseId = ?').get(enrollment.courseId);
    update('enrollments', enrollment.id, {
      completedLessons: completed,
      progressPercent: totalLessons > 0 ? Math.round((completed.length / totalLessons) * 100) : 0,
      lastAccessedAt: now()
    });
  }
  res.json(getById('enrollments', req.params.id));
});

r.post('/enrollments/:id/activate', requireAdmin, (req, res) => {
  update('enrollments', req.params.id, { status: 'active', activatedAt: now() });
  res.json(getById('enrollments', req.params.id));
});

// ---------- Payments ----------

r.post('/payments', requireAuth, (req, res) => {
  const { courseId, courseTitle, enrollmentId, amountCents, currency, bankReference, depositorName, depositDate, proofUrl } = req.body || {};
  const id = insert('payments', {
    id: uid(), userId: req.user.id, studentId: req.user.studentId || '',
    courseId, courseTitle, enrollmentId, amountCents, currency,
    method: 'bank_transfer', bankReference: bankReference || '', depositorName: depositorName || '',
    depositDate: depositDate || '', proofUrl: proofUrl || '', status: 'pending', submittedAt: now()
  });
  res.status(201).json(getById('payments', id));
});

r.get('/payments', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(all('payments', 'SELECT * FROM payments WHERE userId = ? ORDER BY submittedAt DESC', req.user.id));
  }
  if (req.query.status) {
    return res.json(all('payments', 'SELECT * FROM payments WHERE status = ? ORDER BY submittedAt DESC', req.query.status));
  }
  res.json(all('payments', 'SELECT * FROM payments ORDER BY submittedAt DESC'));
});

r.post('/payments/:id/confirm', requireAdmin, (req, res) => {
  const payment = getById('payments', req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  tx(() => {
    update('payments', payment.id, { status: 'confirmed', confirmedAt: now(), confirmedBy: req.user.id });
    if (payment.enrollmentId) update('enrollments', payment.enrollmentId, { status: 'active', activatedAt: now() });
  });
  res.json(getById('payments', payment.id));
});

r.post('/payments/:id/reject', requireAdmin, (req, res) => {
  update('payments', req.params.id, {
    status: 'rejected', rejectedAt: now(), confirmedBy: req.user.id,
    rejectionReason: req.body?.reason || ''
  });
  res.json(getById('payments', req.params.id));
});

// ---------- Live sessions & bookings ----------

r.get('/sessions', (req, res) => {
  if (req.query.upcoming === '1') {
    return res.json(all('liveSessions',
      `SELECT * FROM liveSessions WHERE startTime >= ? AND status != 'cancelled' ORDER BY startTime ASC`, now()));
  }
  res.json(all('liveSessions', 'SELECT * FROM liveSessions ORDER BY startTime DESC'));
});

r.get('/sessions/:id', (req, res) => {
  const session = getById('liveSessions', req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

r.post('/sessions', requireAdmin, (req, res) => {
  const id = insert('liveSessions', {
    ...req.body, id: uid(), bookedCount: 0,
    status: req.body?.status || 'open', createdAt: now()
  });
  res.status(201).json(getById('liveSessions', id));
});

r.patch('/sessions/:id', requireAdmin, (req, res) => {
  update('liveSessions', req.params.id, req.body || {});
  res.json(getById('liveSessions', req.params.id));
});

r.delete('/sessions/:id', requireAdmin, (req, res) => {
  remove('liveSessions', req.params.id);
  res.json({ ok: true });
});

r.post('/sessions/:id/book', requireAuth, (req, res) => {
  try {
    const booking = tx(() => {
      const session = getById('liveSessions', req.params.id);
      if (!session) throw new Error('Session not found');
      if (session.status === 'cancelled') throw new Error('Session was cancelled');
      if (session.status === 'full' || (session.capacity && session.bookedCount >= session.capacity)) {
        throw new Error('Session is full');
      }
      const newCount = (session.bookedCount || 0) + 1;
      update('liveSessions', session.id, {
        bookedCount: newCount,
        ...(session.capacity && newCount >= session.capacity ? { status: 'full' } : {})
      });
      const id = insert('bookings', {
        id: uid(), userId: req.user.id, studentId: req.user.studentId || '', fullName: req.user.fullName,
        sessionId: session.id, sessionTopic: session.topic, sessionStartTime: session.startTime,
        sessionType: session.type, topicCategory: req.body?.topicCategory || session.category || '',
        notes: req.body?.notes || '',
        status: session.priceCents > 0 ? 'pending_payment' : 'confirmed',
        priceCents: session.priceCents || 0, currency: session.currency || 'USD', createdAt: now()
      });
      return getById('bookings', id);
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

r.get('/bookings', requireAuth, (req, res) => {
  if (req.user.role === 'admin' && req.query.sessionId) {
    return res.json(all('bookings', 'SELECT * FROM bookings WHERE sessionId = ?', req.query.sessionId));
  }
  res.json(all('bookings', 'SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC', req.user.id));
});

r.patch('/bookings/:id/status', requireAdmin, (req, res) => {
  update('bookings', req.params.id, { status: req.body?.status, updatedAt: now() });
  res.json(getById('bookings', req.params.id));
});

r.post('/bookings/:id/cancel', requireAuth, (req, res) => {
  const booking = getById('bookings', req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your booking' });
  tx(() => {
    update('bookings', booking.id, { status: 'cancelled', cancelledAt: now() });
    const session = getById('liveSessions', booking.sessionId);
    if (session) {
      const newCount = Math.max(0, (session.bookedCount || 1) - 1);
      update('liveSessions', session.id, {
        bookedCount: newCount,
        ...(session.status === 'full' && (!session.capacity || newCount < session.capacity) ? { status: 'open' } : {})
      });
    }
  });
  res.json(getById('bookings', booking.id));
});

// ---------- Testimonials ----------

r.get('/testimonials', (req, res) => {
  const rows = req.query.published === '1'
    ? all('testimonials', 'SELECT * FROM testimonials WHERE isPublished = 1 ORDER BY createdAt DESC')
    : all('testimonials', 'SELECT * FROM testimonials ORDER BY createdAt DESC');
  res.json(rows);
});

r.post('/testimonials', requireAuth, (req, res) => {
  const { authorName, courseId, content, rating, videoUrl } = req.body || {};
  const id = insert('testimonials', {
    id: uid(), userId: req.user.id, authorName: authorName || req.user.fullName,
    courseId: courseId || null, content: content || '', rating: rating || 5,
    videoUrl: videoUrl || '', isPublished: false, createdAt: now()
  });
  res.status(201).json(getById('testimonials', id));
});

r.patch('/testimonials/:id', requireAdmin, (req, res) => {
  update('testimonials', req.params.id, { isPublished: !!req.body?.isPublished });
  res.json(getById('testimonials', req.params.id));
});

r.delete('/testimonials/:id', requireAdmin, (req, res) => {
  remove('testimonials', req.params.id);
  res.json({ ok: true });
});

// ---------- Newsletter subscribers ----------

r.post('/subscribers', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email);
  if (existing) return res.json({ id: existing.id });
  const id = insert('subscribers', { id: uid(), email, subscribedAt: now() });
  res.status(201).json({ id });
});

// ---------- WhatsApp groups ----------

r.post('/whatsapp-groups', requireAdmin, (req, res) => {
  const { userId, studentId, fullName, sessionId, courseId, groupName, groupUrl } = req.body || {};
  const id = insert('whatsappGroupMembers', {
    id: uid(), userId, studentId: studentId || '', fullName: fullName || '',
    sessionId: sessionId || null, courseId: courseId || null,
    groupName: groupName || '', groupUrl: groupUrl || '',
    addedBy: req.user.id, addedAt: now()
  });
  res.status(201).json(getById('whatsappGroupMembers', id));
});

r.get('/whatsapp-groups', requireAuth, (req, res) => {
  const userId = req.user.role === 'admin' && req.query.userId ? req.query.userId : req.user.id;
  res.json(all('whatsappGroupMembers', 'SELECT * FROM whatsappGroupMembers WHERE userId = ?', userId));
});

// ---------- AI lecture import ----------
// Admins upload a PDF/PPTX/DOCX; we extract the text, ask OpenAI to segment it
// into modules and lessons, and hand the structure back for review. Nothing is
// persisted here — the browser saves the approved lessons to its own store.

r.get('/ai/status', (_req, res) => {
  res.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    adminGateReady: Boolean(process.env.FIREBASE_PROJECT_ID),
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    supported: SUPPORTED_EXTENSIONS,
    maxFileMb: MAX_UPLOAD_MB,
    defaultQuizQuestions: DEFAULT_QUIZ_QUESTIONS,
    narrationReady: Boolean(
      process.env.OPENAI_API_KEY &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_UPLOAD_PRESET
    )
  });
});

r.post('/ai/segment', requireFirebaseAdmin, uploadDocument, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });

    const extracted = await extractDocumentText(req.file.buffer, req.file.originalname);
    const { modules, usage, model, chunks, depth } = await segmentIntoLessons({
      text: extracted.text,
      courseTitle: req.body?.courseTitle || '',
      hint: req.body?.hint || '',
      questionCount: req.body?.questionCount
    });

    const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);
    console.log(
      `[ai] ${req.firebaseUser.email} segmented "${req.file.originalname}" ` +
      `(${extracted.kind}, ${extracted.charCount} chars) into ${modules.length} modules / ` +
      `${lessonCount} lessons using ${usage.calls} ${model} call(s); ` +
      `depth avg ${depth.avgWords}w min ${depth.minWords}w, ${depth.expanded} expanded`
    );

    res.json({
      modules,
      source: {
        filename: req.file.originalname,
        kind: extracted.kind,
        sections: extracted.sections.length,
        charCount: extracted.charCount
      },
      meta: { model, chunks, usage, lessonCount, moduleCount: modules.length, depth }
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Build a quiz for a single existing lesson (backfill for lessons created
// before quizzes, or to replace one an author isn't happy with).
r.post('/ai/quiz', requireFirebaseAdmin, async (req, res, next) => {
  try {
    const { title, bodyText, courseTitle, questionCount } = req.body || {};
    if (!title || !bodyText) return res.status(400).json({ error: 'title and bodyText are required.' });

    const { quiz, usage } = await generateQuizForLesson({ title, bodyText, courseTitle, questionCount });
    console.log(`[ai] ${req.firebaseUser.email} generated a ${quiz.questions.length}-question quiz for "${title}"`);
    res.json({ quiz, usage });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Read a lesson's notes aloud and store the audio, so every lesson can be
// listened to as well as read.
r.post('/ai/narrate', requireFirebaseAdmin, async (req, res, next) => {
  try {
    const { title, bodyText } = req.body || {};
    if (!title || !bodyText) return res.status(400).json({ error: 'title and bodyText are required.' });

    const result = await narrateLesson({ title, bodyText });
    console.log(
      `[ai] ${req.firebaseUser.email} narrated "${title}" — ` +
      `${result.chars} chars in ${result.parts} part(s), ${Math.round(result.seconds || 0)}s`
    );
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Build a narrated slide video for one lesson. This takes tens of seconds, so
// the browser calls it per lesson rather than for a whole course at once.
r.post('/ai/video', requireFirebaseAdmin, async (req, res, next) => {
  try {
    const { title, bodyText, moduleName } = req.body || {};
    if (!title || !bodyText) return res.status(400).json({ error: 'title and bodyText are required.' });

    const started = Date.now();
    const result = await buildLessonVideo({ title, bodyText, moduleName });
    console.log(
      `[ai] ${req.firebaseUser.email} built a video for "${title}" — ` +
      `${result.slides} slides, ${Math.round(result.seconds)}s, ` +
      `${Math.round(result.bytes / 1024)}KB in ${Math.round((Date.now() - started) / 1000)}s`
    );
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export default r;
