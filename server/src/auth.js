import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, now, tx } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-in-production';
const STUDENT_ID_PREFIX = 'EST';

export const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
export const checkPassword = (plain, hash) => bcrypt.compareSync(plain, hash);

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

// Same format the Firebase version issued: EST-2026-00001
export function issueStudentId() {
  return tx(() => {
    const row = db.prepare(`SELECT count FROM counters WHERE name = 'students'`).get();
    const next = (row?.count || 0) + 1;
    db.prepare(`
      INSERT INTO counters (name, count, updatedAt) VALUES ('students', ?, ?)
      ON CONFLICT(name) DO UPDATE SET count = excluded.count, updatedAt = excluded.updatedAt
    `).run(next, now());
    return `${STUDENT_ID_PREFIX}-${new Date().getFullYear()}-${String(next).padStart(5, '0')}`;
  });
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return { uid: rest.id, ...rest };
}

export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}
