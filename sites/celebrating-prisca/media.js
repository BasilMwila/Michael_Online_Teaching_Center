// Shrink uploaded photos and videos with ffmpeg — the same binary installed for
// Empire Skills lesson videos (/usr/local/bin/ffmpeg).
//
// Phone footage is enormous: a single 30 MB clip makes the wall crawl, and the
// storage cap is 2 GB. Compression runs AFTER the submitter gets their
// response, one file at a time so it never competes with the web server for
// the box's two cores. Files keep their original name, so nothing stored in the
// database has to change.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const run = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg';

// Only rewrite a file if we actually saved something worthwhile.
const WORTH_IT = 0.9;

const queue = [];
let working = false;

const VIDEO_ARGS = (input, output) => ([
  '-y', '-loglevel', 'error',
  '-i', input,
  // Cap the long edge at 1280 and keep dimensions even for H.264.
  '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
  '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
  // Put the index at the front so playback can start before the full download.
  '-movflags', '+faststart',
  '-max_muxing_queue_size', '1024',
  output
]);

const IMAGE_ARGS = (input, output) => ([
  '-y', '-loglevel', 'error',
  '-i', input,
  '-vf', "scale='min(2000,iw)':'min(2000,ih)':force_original_aspect_ratio=decrease",
  '-q:v', '4',
  output
]);

// The wall and the carousel display these at a few hundred pixels, so a 2000px
// original means the browser decodes ~10 MB of pixels per photo and stutters
// mid-spin. Each file also gets a small preview: a resized still for photos,
// a grabbed frame for videos, so no carousel ever mounts a whole video.
const PREVIEW_PX = 760;

/** Preview path for an upload: <uuid>.jpg -> <uuid>.t.jpg */
export const previewPath = file => file.replace(/\.[^.]+$/, '.t.jpg');

const PREVIEW_ARGS = (input, output, seconds) => ([
  '-y', '-loglevel', 'error',
  // Seeking before -i is the fast path, and a still frame is all we need.
  ...(seconds === null ? [] : ['-ss', String(seconds)]),
  '-i', input,
  ...(seconds === null ? [] : ['-frames:v', '1']),
  '-vf', `scale='min(${PREVIEW_PX},iw)':'min(${PREVIEW_PX},ih)':force_original_aspect_ratio=decrease`,
  '-q:v', '5',
  output
]);

/**
 * Build the small preview beside a stored upload. Safe to call repeatedly.
 * Returns true when a preview exists afterwards.
 */
export async function makePreview(file) {
  const ext = path.extname(file).toLowerCase();
  const isVideo = ['.mp4', '.webm', '.mov'].includes(ext);
  const out = previewPath(file);
  // A clip shorter than a second gives nothing at -ss 1, so fall back to frame 0.
  const attempts = isVideo ? [1, 0] : [null];

  for (const at of attempts) {
    try {
      await run(FFMPEG, PREVIEW_ARGS(file, out, at), { maxBuffer: 8 * 1024 * 1024, timeout: 120000 });
      const { size } = await stat(out);
      if (size > 0) {
        console.log(`preview ${path.basename(out)} (${Math.round(size / 1024)}KB)`);
        return true;
      }
      await unlink(out).catch(() => {});
    } catch (err) {
      await unlink(out).catch(() => {});
      if (at === attempts.at(-1)) console.error(`preview failed for ${path.basename(file)}: ${err.message.slice(0, 160)}`);
    }
  }
  return false;
}

async function shrink(file) {
  const ext = path.extname(file).toLowerCase();
  const isVideo = ['.mp4', '.webm', '.mov'].includes(ext);
  // Re-encode to the same container so the stored filename stays valid.
  const temp = file.replace(ext, `.min${ext}`);

  try {
    const before = (await stat(file)).size;
    await run(FFMPEG, isVideo ? VIDEO_ARGS(file, temp) : IMAGE_ARGS(file, temp), {
      maxBuffer: 8 * 1024 * 1024,
      timeout: 15 * 60 * 1000
    });

    const after = (await stat(temp)).size;
    if (after > 0 && after < before * WORTH_IT) {
      await rename(temp, file);
      const saved = Math.round((1 - after / before) * 100);
      console.log(
        `compressed ${path.basename(file)}: ` +
        `${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB (${saved}% smaller)`
      );
    } else {
      // Already small enough — keep the original.
      await unlink(temp).catch(() => {});
      console.log(`kept ${path.basename(file)} as uploaded (${Math.round(before / 1024)}KB)`);
    }
  } catch (err) {
    // A failed compression must never cost someone their memory.
    console.error(`compression skipped for ${path.basename(file)}: ${err.message.slice(0, 160)}`);
    await unlink(temp).catch(() => {});
  }

  // Built from the compressed file, so the preview is made once, at the end.
  await makePreview(file);
}

async function drain() {
  if (working) return;
  working = true;
  while (queue.length) await shrink(queue.shift());
  working = false;
}

/** Queue freshly uploaded files for compression. Returns immediately. */
export function compressLater(paths) {
  for (const p of paths) queue.push(p);
  drain();
}

/**
 * Compress one already-stored file and build its preview, awaiting the result.
 * Same encoder settings as the upload queue, so there is one definition of them.
 */
export const compressNow = shrink;

/** Is ffmpeg actually available? Used by the health endpoint. */
export async function ffmpegReady() {
  try {
    await run(FFMPEG, ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
