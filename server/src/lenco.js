// Lenco mobile money collections (Zambia: Airtel, MTN, Zamtel).
// The secret key lives only here — it can move money, so it must never be
// exposed to the browser.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const BASE_URL = process.env.LENCO_BASE_URL || 'https://api.lenco.co/access/v2';

export const OPERATORS = ['airtel', 'mtn', 'zamtel'];

/** Statuses Lenco can report for a collection. */
export const TERMINAL_STATUSES = ['successful', 'failed'];

function apiKey() {
  const key = process.env.LENCO_SECRET_KEY;
  if (!key) {
    throw Object.assign(
      new Error('Mobile money is not configured: LENCO_SECRET_KEY is missing on the server.'),
      { status: 503 }
    );
  }
  return key;
}

async function lencoFetch(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw Object.assign(new Error('Lenco returned a response we could not read.'), { status: 502 });
  }

  if (!res.ok || data.status === false) {
    const message = data?.message || `Lenco request failed (${res.status})`;
    throw Object.assign(new Error(message), {
      status: res.status === 401 ? 503 : res.status === 400 ? 400 : 502,
      lenco: data
    });
  }
  return data.data;
}

/** A reference Lenco will accept: letters, digits, dash, dot, underscore only. */
export function buildReference(prefix = 'ESA') {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`.toUpperCase();
}

/**
 * Ask the customer's phone to approve a payment.
 * Returns the collection object; status is usually "pay-offline", meaning the
 * customer still has to approve the prompt on their handset.
 */
export function initiateMobileMoneyCollection({ amount, reference, phone, operator, country = 'zm', bearer, signal }) {
  const op = String(operator || '').toLowerCase();
  if (!OPERATORS.includes(op)) {
    throw Object.assign(
      new Error(`Choose a mobile money operator: ${OPERATORS.join(', ')}.`),
      { status: 400 }
    );
  }
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw Object.assign(new Error('The payment amount is not valid.'), { status: 400 });
  }

  return lencoFetch('/collections/mobile-money', {
    method: 'POST',
    signal,
    body: {
      amount: value,
      reference,
      phone: String(phone || '').replace(/\s+/g, ''),
      operator: op,
      country,
      // Who absorbs Lenco's fee. Defaults to the merchant unless configured.
      bearer: bearer || process.env.LENCO_FEE_BEARER || 'merchant'
    }
  });
}

/** Current state of a collection we started earlier. */
export function getCollection(reference, { signal } = {}) {
  return lencoFetch(`/collections/status/${encodeURIComponent(reference)}`, { signal });
}

/**
 * Verify a webhook really came from Lenco.
 * The signing key is a SHA-256 hash of the API token, and the signature is an
 * HMAC-SHA512 of the exact bytes received — so this must run on the raw body,
 * not a re-serialised object.
 */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  // Lenco shows the signature key in the dashboard; fall back to the documented
  // derivation (SHA-256 of the API token) if one hasn't been configured.
  const hashKey =
    process.env.LENCO_WEBHOOK_KEY || createHash('sha256').update(apiKey()).digest('hex');
  const expected = createHmac('sha512', hashKey).update(rawBody).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signatureHeader), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Whether mobile money is ready to use on this server. */
export function lencoConfigured() {
  return Boolean(process.env.LENCO_SECRET_KEY);
}
