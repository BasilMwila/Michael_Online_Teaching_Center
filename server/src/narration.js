// Turns a lesson's written notes into spoken audio using OpenAI's text-to-speech,
// then stores the MP3 on Cloudinary so the player can stream it.

const SPEECH_URL = 'https://api.openai.com/v1/audio/speech';

// The speech endpoint rejects input longer than 4096 characters, so long
// lessons are read in pieces and the resulting MP3s joined together.
const MAX_SPEECH_CHARS = 3800;

/**
 * Rewrite lesson notes into something that sounds right read aloud:
 * bullet markers removed, headings turned into spoken transitions.
 */
export function toSpokenScript({ title, bodyText }) {
  const body = String(bodyText || '')
    .replace(/\r/g, '')
    // "Key points" heading -> a natural spoken lead-in
    .replace(/^\s*key points\s*:?\s*$/gim, 'To summarise, the key points are as follows.')
    // Bullet markers read badly; turn each into its own sentence.
    .replace(/^\s*[•\-*]\s*/gm, '')
    .replace(/^\s*\d+[.)]\s*/gm, '')
    // Collapse blank lines into paragraph pauses.
    .replace(/\n{2,}/g, '\n\n')
    .trim();

  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    // A line with no terminal punctuation is usually a heading or bullet —
    // give it a full stop so the voice pauses instead of running on.
    .map((l) => (/[.!?:;]$/.test(l) ? l : `${l}.`));

  return [`${String(title || '').trim()}.`, ...lines].join('\n');
}

/** Split a script into speakable chunks, breaking at sentence ends. */
function splitForSpeech(script, limit = MAX_SPEECH_CHARS) {
  if (script.length <= limit) return [script];

  const sentences = script.match(/[^.!?\n]+[.!?]*\s*/g) || [script];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > limit) {
      chunks.push(current.trim());
      current = '';
    }
    if (sentence.length > limit) {
      // A single enormous sentence: hard-split it.
      if (current) { chunks.push(current.trim()); current = ''; }
      for (let i = 0; i < sentence.length; i += limit) chunks.push(sentence.slice(i, i + limit));
      continue;
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function speak({ apiKey, model, voice, speed, text, signal }) {
  const res = await fetch(SPEECH_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, voice, speed, input: text, response_format: 'mp3' })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let message = `Text-to-speech failed (${res.status})`;
    if (res.status === 401) message = 'The OpenAI API key was rejected.';
    else if (res.status === 429) message = 'OpenAI rate limit or quota reached. Try again shortly.';
    throw Object.assign(new Error(message), { status: res.status === 401 ? 503 : 502, detail: detail.slice(0, 300) });
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Upload an audio buffer to Cloudinary and return its URL. */
async function uploadAudio(buffer, publicIdHint) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    throw Object.assign(
      new Error('Narration storage is not configured: set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.'),
      { status: 503 }
    );
  }

  const form = new FormData();
  // Cloudinary stores audio under its "video" resource type.
  form.append('file', new Blob([buffer], { type: 'audio/mpeg' }), `${publicIdHint}.mp3`);
  form.append('upload_preset', preset);
  form.append('folder', 'lessonNarration');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/video/upload`, {
    method: 'POST',
    body: form
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(
      new Error(data?.error?.message || `Could not store the narration (${res.status}).`),
      { status: 502 }
    );
  }
  return { url: data.secure_url, bytes: data.bytes, seconds: data.duration };
}

/**
 * Narrate one lesson. Returns { audioUrl, seconds, bytes, chars, parts }.
 */
export async function narrateLesson({ title, bodyText, signal } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('Narration is not configured: OPENAI_API_KEY is missing.'), { status: 503 });
  }

  const script = toSpokenScript({ title, bodyText });
  if (script.replace(/\s/g, '').length < 120) {
    throw Object.assign(
      new Error(`"${title}" has too little written content to narrate.`),
      { status: 422 }
    );
  }

  const model = process.env.OPENAI_TTS_MODEL || 'tts-1';
  const voice = process.env.OPENAI_TTS_VOICE || 'nova';
  const speed = Number(process.env.OPENAI_TTS_SPEED) || 1.0;

  const parts = splitForSpeech(script);
  const buffers = [];
  for (const part of parts) {
    buffers.push(await speak({ apiKey, model, voice, speed, text: part, signal }));
  }

  // MP3 is a sequence of self-contained frames, so joining the parts end to end
  // plays back as one continuous track.
  const audio = Buffer.concat(buffers);
  const slug = String(title || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  const stored = await uploadAudio(audio, `${slug}-${Date.now()}`);

  return {
    audioUrl: stored.url,
    seconds: stored.seconds,
    bytes: stored.bytes ?? audio.length,
    chars: script.length,
    parts: parts.length,
    voice,
    model
  };
}
