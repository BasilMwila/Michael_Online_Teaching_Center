// One-off: build previews for media uploaded before previews existed, compress
// any video that was stored uncompressed, and record the preview path on the
// post so the carousel and wall stop loading originals.
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressNow, makePreview, previewPath } from './media.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const data = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const uploads = path.join(data, 'uploads');
const db = new DatabaseSync(path.join(data, 'diary.db'));
db.exec('PRAGMA busy_timeout=10000');

for (const row of db.prepare('SELECT id,title,media FROM posts').all()) {
  const media = JSON.parse(row.media);
  let changed = false;
  for (const m of media) {
    const name = String(m.url || '').replace(/^uploads\//, '');
    const file = path.join(uploads, name);
    if (!name || !existsSync(file)) { console.log(`  missing: ${name}`); continue; }
    // compressNow builds the preview itself; images here are already resized.
    if (m.type === 'video') await compressNow(file); else await makePreview(file);
    const thumb = 'uploads/' + previewPath(name);
    if (existsSync(path.join(uploads, previewPath(name))) && m.thumb !== thumb) { m.thumb = thumb; changed = true; }
  }
  if (changed) {
    db.prepare('UPDATE posts SET media=? WHERE id=?').run(JSON.stringify(media), row.id);
    console.log(`updated "${row.title}" (${media.filter(m => m.thumb).length}/${media.length} previews)`);
  }
}
db.close();
