import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'empireskills.db');
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  passwordHash TEXT NOT NULL,
  fullName TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  studentId TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  subscribedToUpdates INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  shortDescription TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  mode TEXT DEFAULT 'self_paced',
  priceCents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  durationHours REAL,
  instructorName TEXT DEFAULT '',
  coverImageUrl TEXT DEFAULT '',
  learningOutcomes TEXT DEFAULT '[]',
  isPublished INTEGER DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  courseId TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  videoUrl TEXT DEFAULT '',
  videoIsUpload INTEGER DEFAULT 0,
  durationMinutes REAL,
  orderIndex INTEGER DEFAULT 0,
  resources TEXT DEFAULT '[]',
  createdAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(courseId, orderIndex);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  courseId TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lessonId TEXT NOT NULL,
  title TEXT DEFAULT '',
  passScore INTEGER DEFAULT 70,
  questions TEXT DEFAULT '[]',
  createdAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(courseId, lessonId);

CREATE TABLE IF NOT EXISTS quizAttempts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  quizId TEXT NOT NULL,
  courseId TEXT,
  lessonId TEXT,
  answers TEXT DEFAULT '[]',
  score INTEGER,
  correct INTEGER,
  total INTEGER,
  passed INTEGER DEFAULT 0,
  attemptedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quizAttempts(userId, courseId);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  courseId TEXT NOT NULL REFERENCES courses(id),
  courseTitle TEXT DEFAULT '',
  courseMode TEXT DEFAULT '',
  priceCents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending_payment',
  progressPercent INTEGER DEFAULT 0,
  completedLessons TEXT DEFAULT '[]',
  enrolledAt TEXT,
  activatedAt TEXT,
  lastAccessedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(userId);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(courseId);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  studentId TEXT DEFAULT '',
  courseId TEXT,
  courseTitle TEXT DEFAULT '',
  enrollmentId TEXT,
  amountCents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  method TEXT DEFAULT 'bank_transfer',
  bankReference TEXT DEFAULT '',
  depositorName TEXT DEFAULT '',
  depositDate TEXT DEFAULT '',
  proofUrl TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  submittedAt TEXT,
  confirmedAt TEXT,
  confirmedBy TEXT,
  rejectedAt TEXT,
  rejectionReason TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(userId);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS liveSessions (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'one_on_one',
  topic TEXT NOT NULL,
  category TEXT DEFAULT '',
  startTime TEXT,
  endTime TEXT,
  capacity INTEGER,
  bookedCount INTEGER DEFAULT 0,
  priceCents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  meetingUrl TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  studentId TEXT DEFAULT '',
  fullName TEXT DEFAULT '',
  sessionId TEXT NOT NULL REFERENCES liveSessions(id),
  sessionTopic TEXT DEFAULT '',
  sessionStartTime TEXT,
  sessionType TEXT DEFAULT '',
  topicCategory TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'confirmed',
  priceCents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  createdAt TEXT,
  updatedAt TEXT,
  cancelledAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId);
CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(sessionId);

CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id),
  authorName TEXT DEFAULT '',
  courseId TEXT,
  content TEXT DEFAULT '',
  rating INTEGER DEFAULT 5,
  videoUrl TEXT DEFAULT '',
  isPublished INTEGER DEFAULT 0,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  subscribedAt TEXT
);

CREATE TABLE IF NOT EXISTS whatsappGroupMembers (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  studentId TEXT DEFAULT '',
  fullName TEXT DEFAULT '',
  sessionId TEXT,
  courseId TEXT,
  groupName TEXT DEFAULT '',
  groupUrl TEXT DEFAULT '',
  addedBy TEXT,
  addedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_user ON whatsappGroupMembers(userId);
`);

// Per-table lists of JSON-encoded and boolean columns, used by toRow/fromRow
// so route code can pass plain JS objects around.
const META = {
  users: { bool: ['subscribedToUpdates'], json: [] },
  courses: { bool: ['isPublished'], json: ['learningOutcomes'] },
  lessons: { bool: ['videoIsUpload'], json: ['resources'] },
  quizzes: { bool: [], json: ['questions'] },
  quizAttempts: { bool: ['passed'], json: ['answers'] },
  enrollments: { bool: [], json: ['completedLessons'] },
  payments: { bool: [], json: [] },
  liveSessions: { bool: [], json: [] },
  bookings: { bool: [], json: [] },
  testimonials: { bool: ['isPublished'], json: [] },
  subscribers: { bool: [], json: [] },
  whatsappGroupMembers: { bool: [], json: [] },
  counters: { bool: [], json: [] }
};

const columnsCache = {};
function columnsOf(table) {
  if (!columnsCache[table]) {
    columnsCache[table] = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table).map((r) => r.name);
  }
  return columnsCache[table];
}

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();

// Convert a JS object into bindable column values for a table. Unknown keys are
// dropped, which doubles as protection against clients injecting extra columns.
function toRow(table, data) {
  const meta = META[table];
  const cols = columnsOf(table);
  const row = {};
  for (const [key, value] of Object.entries(data)) {
    if (!cols.includes(key) || value === undefined) continue;
    if (meta.json.includes(key)) row[key] = JSON.stringify(value ?? []);
    else if (typeof value === 'boolean' || meta.bool.includes(key)) row[key] = value ? 1 : 0;
    else if (value instanceof Date) row[key] = value.toISOString();
    else row[key] = value;
  }
  return row;
}

export function fromRow(table, row) {
  if (!row) return null;
  const meta = META[table];
  const out = { ...row };
  for (const key of meta.json) if (typeof out[key] === 'string') { try { out[key] = JSON.parse(out[key]); } catch { out[key] = []; } }
  for (const key of meta.bool) if (key in out) out[key] = !!out[key];
  return out;
}

export function insert(table, data) {
  const row = toRow(table, data);
  const cols = Object.keys(row);
  db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(...cols.map((c) => row[c]));
  return row.id;
}

export function update(table, id, data) {
  const row = toRow(table, data);
  delete row.id;
  const cols = Object.keys(row);
  if (!cols.length) return;
  db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
    .run(...cols.map((c) => row[c]), id);
}

export function getById(table, id) {
  return fromRow(table, db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
}

export function remove(table, id) {
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
