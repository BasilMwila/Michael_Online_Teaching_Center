// Turns raw lecture-document text into a structured course outline
// (modules -> lessons) using the OpenAI API.

const API_URL = 'https://api.openai.com/v1/chat/completions';

// Roughly 4 characters per token, so ~110k chars ≈ 28k tokens of input per call.
// Long documents are split and the resulting modules stitched back together.
const MAX_CHARS_PER_CALL = 110_000;

// Shared shape for a lesson check. `correctOptionIndex` matches what the
// existing scoreQuiz() in the browser app expects.
const QUIZ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['passScore', 'questions'],
  properties: {
    passScore: {
      type: 'integer',
      description: 'Percentage needed to pass, normally 70.'
    },
    questions: {
      type: 'array',
      description: '3-4 multiple-choice questions answerable from this lesson alone.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['questionText', 'options', 'correctOptionIndex', 'explanation'],
        properties: {
          questionText: { type: 'string' },
          options: {
            type: 'array',
            description: 'Exactly four plausible options; only one is correct.',
            items: { type: 'string' }
          },
          correctOptionIndex: {
            type: 'integer',
            description: 'Zero-based index into options of the single correct answer.'
          },
          explanation: {
            type: 'string',
            description: 'One sentence on why that answer is right.'
          }
        }
      }
    }
  }
};

const LESSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['modules'],
  properties: {
    modules: {
      type: 'array',
      description: 'Ordered modules covering the document.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'summary', 'lessons'],
        properties: {
          title: { type: 'string', description: 'Short module name, no numbering.' },
          summary: { type: 'string', description: 'One or two sentences on what the module covers.' },
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'summary', 'bodyText', 'keyPoints', 'durationMinutes', 'quiz'],
              properties: {
                title: { type: 'string', description: 'Lesson title, no numbering.' },
                summary: { type: 'string', description: 'One sentence describing the lesson.' },
                bodyText: {
                  type: 'string',
                  description:
                    'The teaching notes for this lesson, written in clear prose with short ' +
                    'paragraphs and bullet lines where useful. Drawn strictly from the source text.'
                },
                keyPoints: {
                  type: 'array',
                  description: '3-6 takeaways a student should remember.',
                  items: { type: 'string' }
                },
                durationMinutes: {
                  type: 'number',
                  description: 'Realistic study time in minutes for this lesson.'
                },
                quiz: QUIZ_SCHEMA
              }
            }
          }
        }
      }
    }
  }
};

const SYSTEM_PROMPT = `
You are a curriculum designer for an online training academy. You convert raw
lecture material (extracted from PDFs, slide decks or documents) into a clean,
study-ready course outline.

Rules:
- Segment by TOPIC, not by page or slide number. Merge fragments that belong to
  one idea; split a long topic that clearly contains several distinct ideas.
- Produce modules, each holding related lessons. A short document may be a
  single module. Aim for 2-8 lessons per module.
- Titles must be descriptive and human ("Managing Workplace Risk"), never
  "Lesson 1" or "Page 4". Do not put numbers in titles; ordering is handled
  separately.
- bodyText is the actual study material. Rewrite the source into clear teaching
  prose a student can learn from. Keep the author's meaning, terminology,
  definitions, examples and figures.
- NEVER invent facts, statistics, names or examples that are not in the source
  text. If a section is thin, keep the lesson short rather than padding it.
- Ignore artefacts of the source file: page furniture, headers/footers, slide
  numbers, "[Page 3]" markers, tables of contents and copyright notices.
- Write in clear British/international English suited to adult learners.

Every lesson also gets a short quiz that a student must pass before moving on:
- 3-4 multiple-choice questions, each with exactly four options.
- Every question must be answerable from that lesson's bodyText alone. Never
  test something the lesson does not teach.
- Wrong options must be plausible, not obviously silly, and all four options
  should be similar in length and style so the answer isn't guessable.
- Vary which position holds the correct answer across questions.
- Set passScore to 70 unless the material is safety- or compliance-critical,
  where 80 is appropriate.
`.trim();

/** Split text into chunks at paragraph boundaries, each under `limit` chars. */
function chunkText(text, limit = MAX_CHARS_PER_CALL) {
  if (text.length <= limit) return [text];

  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > limit) {
      chunks.push(current);
      current = '';
    }
    // A single paragraph larger than the limit gets hard-split.
    if (para.length > limit) {
      if (current) { chunks.push(current); current = ''; }
      for (let i = 0; i < para.length; i += limit) chunks.push(para.slice(i, i + limit));
      continue;
    }
    current = current ? `${current}\n\n${para}` : para;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function callOpenAI({ apiKey, model, messages, signal, schema }) {
  const jsonSchema = schema
    ? { name: schema.name, strict: true, schema: schema.schema }
    : { name: 'course_outline', strict: true, schema: LESSON_SCHEMA };
  const res = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_schema', json_schema: jsonSchema }
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let message = `OpenAI request failed (${res.status})`;
    if (res.status === 401) message = 'The OpenAI API key was rejected. Check OPENAI_API_KEY on the server.';
    else if (res.status === 429) message = 'OpenAI rate limit or quota reached. Try again shortly.';
    else if (res.status >= 500) message = 'OpenAI is temporarily unavailable. Try again shortly.';
    throw Object.assign(new Error(message), { status: res.status === 401 ? 503 : 502, detail: detail.slice(0, 500) });
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response.');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI returned a response that could not be parsed.');
  }

  return { parsed, usage: data.usage || {} };
}

/**
 * Drop malformed questions rather than shipping a quiz a student can never
 * pass (e.g. an out-of-range answer index or duplicate options).
 */
export function sanitiseQuiz(quiz) {
  if (!quiz) return null;
  const questions = (quiz.questions || []).filter((q) => {
    const options = Array.isArray(q.options) ? q.options.filter((o) => String(o).trim()) : [];
    const idx = Number(q.correctOptionIndex);
    return (
      String(q.questionText || '').trim() &&
      options.length >= 2 &&
      new Set(options.map((o) => o.trim().toLowerCase())).size === options.length &&
      Number.isInteger(idx) && idx >= 0 && idx < options.length
    );
  });
  if (!questions.length) return null;

  const passScore = Number(quiz.passScore);
  return {
    passScore: Number.isFinite(passScore) ? Math.min(100, Math.max(50, passScore)) : 70,
    questions
  };
}

/** Merge modules from separate chunks, folding duplicates by title. */
function mergeModules(batches) {
  const merged = [];
  const byTitle = new Map();

  for (const modules of batches) {
    for (const mod of modules) {
      const key = String(mod.title || '').trim().toLowerCase();
      const existing = key && byTitle.get(key);
      if (existing) {
        existing.lessons.push(...(mod.lessons || []));
      } else {
        const copy = { ...mod, lessons: [...(mod.lessons || [])] };
        merged.push(copy);
        if (key) byTitle.set(key, copy);
      }
    }
  }
  return merged;
}

/**
 * Segment extracted document text into modules and lessons.
 * Returns { modules, usage: { promptTokens, completionTokens, calls } }.
 */
export async function segmentIntoLessons({ text, courseTitle = '', hint = '', signal } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('The AI import is not configured yet: OPENAI_API_KEY is missing on the server.'),
      { status: 503 }
    );
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  const chunks = chunkText(text);
  const batches = [];
  const usage = { promptTokens: 0, completionTokens: 0, calls: 0 };

  for (let i = 0; i < chunks.length; i++) {
    const context = [
      courseTitle && `The course is titled "${courseTitle}".`,
      hint && `Additional instructions from the course author: ${hint}`,
      chunks.length > 1 &&
        `This is part ${i + 1} of ${chunks.length} of a longer document. Only segment the text ` +
        `given below; earlier or later parts are handled separately. Do not repeat content ` +
        `from other parts and do not add introductions or conclusions for the whole document.`
    ].filter(Boolean).join('\n');

    const { parsed, usage: u } = await callOpenAI({
      apiKey,
      model,
      signal,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${context}\n\nSegment the following lecture material into modules and lessons.\n\n---\n${chunks[i]}\n---`
        }
      ]
    });

    batches.push(parsed.modules || []);
    usage.promptTokens += u.prompt_tokens || 0;
    usage.completionTokens += u.completion_tokens || 0;
    usage.calls += 1;
  }

  const modules = mergeModules(batches).filter((m) => (m.lessons || []).length > 0);
  if (!modules.length) throw new Error('The document could not be segmented into lessons.');

  for (const mod of modules) {
    for (const lesson of mod.lessons) lesson.quiz = sanitiseQuiz(lesson.quiz);
  }

  return { modules, usage, model, chunks: chunks.length };
}

/**
 * Build a quiz for one existing lesson from its own notes.
 * Used to backfill lessons that were created before quizzes existed.
 */
export async function generateQuizForLesson({ title, bodyText, courseTitle = '' } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('The AI features are not configured: OPENAI_API_KEY is missing on the server.'),
      { status: 503 }
    );
  }
  const text = String(bodyText || '').trim();
  if (text.length < 120) {
    throw Object.assign(
      new Error(`"${title}" has too little written content to build a fair quiz from.`),
      { status: 422 }
    );
  }

  const { parsed, usage } = await callOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    schema: { name: 'lesson_quiz', schema: QUIZ_SCHEMA },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `${courseTitle ? `Course: "${courseTitle}".\n` : ''}` +
          `Write the quiz for the lesson "${title}". Questions must be answerable ` +
          `from these lesson notes alone:\n\n---\n${text.slice(0, MAX_CHARS_PER_CALL)}\n---`
      }
    ]
  });

  const quiz = sanitiseQuiz(parsed);
  if (!quiz) throw new Error(`Could not build a usable quiz for "${title}".`);
  return { quiz, usage };
}
