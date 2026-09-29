// Builds a narrated slide video for a lesson: the notes are split into slides,
// each slide is rendered as a branded image, spoken with OpenAI TTS, then the
// stills and audio are stitched into an MP4 with ffmpeg and stored on Cloudinary.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { synthesiseSpeech, uploadMedia, toSpokenScript } from './narration.js';

const run = promisify(execFile);

const WIDTH = 1280;
const HEIGHT = 720;
const NAVY = '#001d3d';
const NAVY_DEEP = '#001328';
const GOLD = '#c6a136';

// Roughly how many characters of DejaVu Sans fit on a line at the body size.
const CHARS_PER_LINE = 54;
const MAX_LINES_PER_SLIDE = 8;

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

/** Greedy word wrap to a character budget. */
function wrap(text, width = CHARS_PER_LINE) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Break the lesson notes into slide-sized passages. Paragraphs are the natural
 * unit; anything too long for one slide is split further at sentence ends.
 */
export function buildSlides({ title, bodyText }) {
  const paragraphs = String(bodyText || '')
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const slides = [];
  for (const para of paragraphs) {
    // Bullet blocks read as one slide per bullet group; keep them together.
    const clean = para.replace(/^\s*[•\-*]\s*/gm, '• ');
    const lines = wrap(clean.replace(/\n/g, ' '));

    if (lines.length <= MAX_LINES_PER_SLIDE) {
      slides.push(clean.replace(/\n/g, ' '));
      continue;
    }
    // Too long: split at sentence boundaries into slide-sized pieces.
    const sentences = clean.match(/[^.!?]+[.!?]+\s*/g) || [clean];
    let buf = '';
    for (const s of sentences) {
      const candidate = buf ? `${buf} ${s.trim()}` : s.trim();
      if (wrap(candidate).length > MAX_LINES_PER_SLIDE && buf) {
        slides.push(buf);
        buf = s.trim();
      } else {
        buf = candidate;
      }
    }
    if (buf) slides.push(buf);
  }

  return [{ kind: 'title', text: title }, ...slides.map((text) => ({ kind: 'body', text }))];
}

/** Render one slide to a PNG buffer. */
async function renderSlide({ sharp, slide, lessonTitle, moduleName, index, total }) {
  const isTitle = slide.kind === 'title';
  let svg;

  if (isTitle) {
    const lines = wrap(slide.text, 30);
    const startY = HEIGHT / 2 - (lines.length - 1) * 33 - 10;
    svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${WIDTH * 0.78}" height="8" fill="${GOLD}"/>
  <rect x="${WIDTH * 0.78}" y="0" width="${WIDTH * 0.22}" height="8" fill="#ffffff" opacity="0.25"/>
  ${moduleName ? `<text x="80" y="${startY - 80}" font-family="DejaVu Sans" font-size="26" fill="${GOLD}" letter-spacing="3">${escapeXml(moduleName.toUpperCase())}</text>` : ''}
  ${lines.map((l, i) => `<text x="80" y="${startY + i * 66}" font-family="DejaVu Sans" font-size="58" font-weight="bold" fill="#ffffff">${escapeXml(l)}</text>`).join('\n  ')}
  <text x="80" y="${HEIGHT - 60}" font-family="DejaVu Sans" font-size="24" fill="${GOLD}" letter-spacing="2">EMPIRE SKILLS ACADEMY</text>
</svg>`;
  } else {
    const lines = wrap(slide.text);
    const startY = HEIGHT / 2 - (lines.length - 1) * 26 + 6;
    svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
  <rect x="0" y="0" width="${WIDTH}" height="76" fill="${NAVY}"/>
  <rect x="0" y="76" width="${WIDTH * 0.78}" height="5" fill="${GOLD}"/>
  <text x="56" y="49" font-family="DejaVu Sans" font-size="27" font-weight="bold" fill="#ffffff">${escapeXml(lessonTitle.slice(0, 64))}</text>
  ${lines.map((l, i) => `<text x="80" y="${startY + i * 52}" font-family="DejaVu Sans" font-size="34" fill="#12386c">${escapeXml(l)}</text>`).join('\n  ')}
  <text x="${WIDTH - 56}" y="${HEIGHT - 44}" text-anchor="end" font-family="DejaVu Sans" font-size="22" fill="#84acd8">${index} / ${total}</text>
  <rect x="0" y="${HEIGHT - 8}" width="${WIDTH * 0.2}" height="8" fill="${NAVY}"/>
  <rect x="${WIDTH * 0.2}" y="${HEIGHT - 8}" width="${WIDTH * 0.8}" height="8" fill="${GOLD}"/>
</svg>`;
  }

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function audioSeconds(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file
  ]);
  return Number(String(stdout).trim()) || 0;
}

/**
 * Produce a narrated slide video for one lesson.
 * Returns { videoUrl, seconds, slides, bytes }.
 */
export async function buildLessonVideo({ title, bodyText, moduleName = '', signal } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error('Video generation needs OPENAI_API_KEY on the server.'), { status: 503 });
  }
  const text = String(bodyText || '').trim();
  if (text.length < 200) {
    throw Object.assign(new Error(`"${title}" has too little content to build a video from.`), { status: 422 });
  }

  const { default: sharp } = await import('sharp');
  const slides = buildSlides({ title, bodyText: text });
  const dir = await mkdtemp(path.join(tmpdir(), 'lessonvid-'));

  try {
    const segments = [];
    let total = 0;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      // What the voice says for this slide. The title slide gets a short intro.
      const spoken = slide.kind === 'title'
        ? `${title}.${moduleName ? ` Part of ${moduleName}.` : ''}`
        : toSpokenScript({ title: '', bodyText: slide.text });

      const png = await renderSlide({
        sharp, slide, lessonTitle: title, moduleName,
        index: i, total: slides.length - 1
      });
      const imgPath = path.join(dir, `slide-${i}.png`);
      await writeFile(imgPath, png);

      const mp3 = await synthesiseSpeech({ text: spoken, signal });
      const audioPath = path.join(dir, `slide-${i}.mp3`);
      await writeFile(audioPath, mp3);

      // Hold the still for exactly as long as its narration, plus a short beat.
      const dur = (await audioSeconds(audioPath)) + 0.6;
      total += dur;

      const segPath = path.join(dir, `seg-${i}.mp4`);
      await run('ffmpeg', [
        '-y', '-loglevel', 'error',
        '-loop', '1', '-i', imgPath,
        '-i', audioPath,
        '-c:v', 'libx264', '-tune', 'stillimage', '-preset', 'veryfast',
        '-t', String(dur.toFixed(2)),
        '-c:a', 'aac', '-b:a', '96k', '-ar', '44100',
        '-pix_fmt', 'yuv420p', '-r', '10',
        '-vf', `scale=${WIDTH}:${HEIGHT}`,
        '-shortest', segPath
      ], { maxBuffer: 8 * 1024 * 1024 });

      segments.push(segPath);
    }

    // Join the per-slide clips without re-encoding.
    const listPath = path.join(dir, 'list.txt');
    await writeFile(listPath, segments.map((s) => `file '${s}'`).join('\n'));
    const outPath = path.join(dir, 'lesson.mp4');
    await run('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', listPath,
      '-c', 'copy', outPath
    ], { maxBuffer: 8 * 1024 * 1024 });

    const { readFile } = await import('node:fs/promises');
    const video = await readFile(outPath);
    const slug = String(title || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    const stored = await uploadMedia(video, `${slug}-${Date.now()}.mp4`, 'video/mp4', 'lessonVideos');

    return {
      videoUrl: stored.url,
      seconds: stored.seconds ?? Math.round(total),
      bytes: stored.bytes ?? video.length,
      slides: slides.length
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
