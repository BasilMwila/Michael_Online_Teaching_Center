// Thin client for the Node API that runs alongside the site (nginx proxies
// /api to it in production; see vite.config.js for the dev proxy).
// Calls are authenticated with the caller's Firebase ID token.

import { auth } from '../firebase.js';

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function authHeader() {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function unwrap(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // A proxy error or HTML error page rather than our API.
    throw new Error(`Unexpected response from the server (${res.status}).`);
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function apiGet(path) {
  return unwrap(await fetch(`${BASE}${path}`));
}

export async function apiPost(path, body) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  return unwrap(await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }));
}

/**
 * POST a file plus form fields as multipart/form-data.
 * `onProgress` receives 0-100 while the file uploads.
 */
export function apiUpload(path, { file, fields = {}, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    authHeader().then((headers) => {
      const form = new FormData();
      form.append('file', file);
      for (const [k, v] of Object.entries(fields)) if (v != null) form.append(k, v);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}${path}`);
      for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data;
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          return reject(new Error(`Unexpected response from the server (${xhr.status}).`));
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || `Request failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Could not reach the server.'));
      xhr.ontimeout = () => reject(new Error('The request timed out.'));
      // Segmenting a long document can take a few minutes.
      xhr.timeout = 10 * 60 * 1000;

      signal?.addEventListener('abort', () => xhr.abort());
      xhr.send(form);
    }).catch(reject);
  });
}
