// The browser app signs in with Firebase, while this API issues its own JWTs.
// The AI endpoints spend real money per call, so they must not be open. Here we
// verify a Firebase ID token against Google's public certificates (no service
// account needed) and then check the caller against an admin allowlist.

import jwt from 'jsonwebtoken';

const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache = { keys: null, expiresAt: 0 };

async function googleCerts() {
  if (certCache.keys && Date.now() < certCache.expiresAt) return certCache.keys;

  const res = await fetch(CERT_URL);
  if (!res.ok) throw new Error(`Could not fetch Google signing certificates (${res.status})`);
  const keys = await res.json();

  // Respect Google's cache header; fall back to an hour.
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1]) || 3600;
  certCache = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Read the caller's own users/{uid} profile from Firestore, authenticated as
 * them. Firestore's own rules therefore apply — we never see more than the
 * signed-in user can already see, and no service account is required.
 * Returns the role string, or null if it could not be read.
 */
async function firestoreRole(uid, idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents/users/${encodeURIComponent(uid)}`;

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return null;
    const doc = await res.json();
    return doc?.fields?.role?.stringValue || null;
  } catch {
    return null;
  }
}

/** Verify a Firebase ID token and return its decoded payload. */
export async function verifyFirebaseToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw Object.assign(new Error('FIREBASE_PROJECT_ID is not configured'), { status: 503 });

  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded?.header?.kid;
  if (!kid) throw Object.assign(new Error('Malformed token'), { status: 401 });

  const certs = await googleCerts();
  const cert = certs[kid];
  if (!cert) throw Object.assign(new Error('Unknown token signing key'), { status: 401 });

  try {
    return jwt.verify(idToken, cert, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`
    });
  } catch {
    throw Object.assign(new Error('Invalid or expired sign-in token'), { status: 401 });
  }
}

/**
 * Express middleware: caller must present a valid Firebase ID token whose email
 * is listed in ADMIN_EMAILS. Deliberately fails closed when the allowlist is
 * empty, so a misconfigured deploy cannot leave the endpoint wide open.
 */
/**
 * Express middleware: the caller must present a valid Firebase ID token AND be
 * an administrator — either because their profile role is "admin", or because
 * their email is listed in ADMIN_EMAILS (a break-glass override that works even
 * if Firestore is unreachable).
 */
export async function requireFirebaseAdmin(req, res, next) {
  try {
    if (!process.env.FIREBASE_PROJECT_ID) {
      return res.status(503).json({
        error: 'AI features are not configured: set FIREBASE_PROJECT_ID on the server.'
      });
    }

    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Sign in as an administrator to use this.' });

    const payload = await verifyFirebaseToken(token);
    const email = String(payload.email || '').toLowerCase();
    const uid = payload.user_id || payload.sub;

    if (!payload.email_verified && process.env.REQUIRE_VERIFIED_EMAIL === 'true') {
      return res.status(403).json({ error: 'Verify your email address first.' });
    }

    if (adminEmails().includes(email)) {
      req.firebaseUser = { uid, email, via: 'allowlist' };
      return next();
    }

    const role = await firestoreRole(uid, token);
    if (role === 'admin') {
      req.firebaseUser = { uid, email, via: 'role' };
      return next();
    }

    console.warn(`[ai] rejected import from "${email}" (role=${role ?? 'unreadable'})`);
    return res.status(403).json({
      error:
        role === null
          ? `Could not confirm the role for ${email}. Ask for this account to be added to ADMIN_EMAILS on the server.`
          : `The account ${email} is not an administrator, so it cannot run the AI import.`
    });
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message || 'Not authorised' });
  }
}
