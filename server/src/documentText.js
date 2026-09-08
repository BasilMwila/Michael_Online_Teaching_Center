// Text extraction from uploaded lecture documents (PDF, PPTX, DOCX, plain text).
// Everything here works on an in-memory Buffer — nothing is written to disk.

import AdmZip from 'adm-zip';

/** Collapse runaway whitespace but keep paragraph breaks. */
function tidy(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Decode the XML entities that show up in Office XML text runs. */
function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&');
}

async function extractPdf(buffer) {
  // The legacy build runs on the main thread, which is what we want in Node.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0
  }).promise;

  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();

    // pdf.js gives us positioned runs; rebuild lines using the `hasEOL` hints
    // so headings and bullets don't collapse into one long paragraph.
    let text = '';
    for (const item of content.items) {
      if (typeof item.str !== 'string') continue;
      text += item.str;
      if (item.hasEOL) text += '\n';
      else if (!item.str.endsWith(' ')) text += ' ';
    }
    page.cleanup();

    const clean = tidy(text);
    if (clean) pages.push({ label: `Page ${n}`, text: clean });
  }
  await doc.destroy();

  return { sections: pages, kind: 'pdf' };
}

function pptxSlideText(xml) {
  // <a:t> holds every visible text run. <a:p> marks a paragraph.
  const paragraphs = xml.split(/<a:p[\s>]/).slice(1);
  const lines = [];
  for (const p of paragraphs) {
    const runs = [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]));
    const line = runs.join('').trim();
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

function extractPptx(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const slideNo = (name) => Number(name.match(/(\d+)\.xml$/)?.[1] || 0);

  const slides = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => slideNo(a.entryName) - slideNo(b.entryName));

  const notes = new Map();
  for (const e of entries) {
    if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(e.entryName)) {
      notes.set(slideNo(e.entryName), pptxSlideText(e.getData().toString('utf8')));
    }
  }

  const sections = [];
  for (const entry of slides) {
    const n = slideNo(entry.entryName);
    const body = pptxSlideText(entry.getData().toString('utf8'));
    // Speaker notes usually carry the actual lecture narrative, so keep them.
    const note = notes.get(n);
    const text = tidy([body, note ? `Speaker notes: ${note}` : ''].filter(Boolean).join('\n'));
    if (text) sections.push({ label: `Slide ${n}`, text });
  }

  if (!sections.length) throw new Error('No readable slides found in this PowerPoint file.');
  return { sections, kind: 'pptx' };
}

function extractDocx(buffer) {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) throw new Error('This does not look like a valid Word document.');

  const xml = entry.getData().toString('utf8');
  const paragraphs = xml.split(/<w:p[\s>]/).slice(1);
  const lines = [];
  for (const p of paragraphs) {
    const runs = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXml(m[1]));
    const line = runs.join('').trim();
    if (line) lines.push(line);
  }

  const text = tidy(lines.join('\n'));
  if (!text) throw new Error('No readable text found in this Word document.');
  return { sections: [{ label: 'Document', text }], kind: 'docx' };
}

function extractPlain(buffer) {
  const text = tidy(buffer.toString('utf8'));
  if (!text) throw new Error('This file appears to be empty.');
  return { sections: [{ label: 'Document', text }], kind: 'text' };
}

const BY_EXTENSION = {
  pdf: extractPdf,
  pptx: extractPptx,
  docx: extractDocx,
  txt: extractPlain,
  md: extractPlain
};

export const SUPPORTED_EXTENSIONS = Object.keys(BY_EXTENSION);

/**
 * Pull readable text out of an uploaded document.
 * Returns { text, sections, kind, charCount } where `sections` are pages/slides.
 */
export async function extractDocumentText(buffer, filename = '') {
  const ext = String(filename).split('.').pop()?.toLowerCase();
  const handler = BY_EXTENSION[ext];
  if (!handler) {
    throw Object.assign(
      new Error(`Unsupported file type "${ext || 'unknown'}". Upload a ${SUPPORTED_EXTENSIONS.join(', ')} file.`),
      { status: 400 }
    );
  }

  const result = await handler(buffer);
  const text = result.sections.map((s) => `[${s.label}]\n${s.text}`).join('\n\n');

  if (text.replace(/\[[^\]]*\]/g, '').trim().length < 200) {
    throw Object.assign(
      new Error(
        'Almost no text could be read from this file. If it is a scanned PDF (images of pages), ' +
        'it needs to be run through OCR before it can be segmented.'
      ),
      { status: 422 }
    );
  }

  return { text, sections: result.sections, kind: result.kind, charCount: text.length };
}
