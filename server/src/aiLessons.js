// Turns raw lecture-document text into a structured course outline
// (modules -> lessons) using the OpenAI API.

const API_URL = 'https://api.openai.com/v1/chat/completions';

// Input per call, ~4 chars per token. Deliberately modest: the output cap is
// the real constraint, so feeding less source per call leaves far more room to
// write each lesson in full. Long documents are split and stitched back.
const MAX_CHARS_PER_CALL = 32_000;

// Without this the API defaults to 4096 completion tokens, which forced every
// lesson to be compressed to a few lines. gpt-4o allows up to 16384.
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 16_000;

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
      description: 'The multiple-choice questions, answerable from this lesson alone.',
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

// How many questions each lesson quiz carries. Callers may override per request;
// the server default can be changed with AI_QUIZ_QUESTIONS.
export const DEFAULT_QUIZ_QUESTIONS = Number(process.env.AI_QUIZ_QUESTIONS) || 5;
const MIN_QUIZ_QUESTIONS = 3;
const MAX_QUIZ_QUESTIONS = 12;

export function clampQuestionCount(n) {
  const value = Math.round(Number(n));
  if (!Number.isFinite(value)) return DEFAULT_QUIZ_QUESTIONS;
  return Math.min(MAX_QUIZ_QUESTIONS, Math.max(MIN_QUIZ_QUESTIONS, value));
}

const SYSTEM_PROMPT_TEMPLATE = `
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
- bodyText is the actual study material, and it must TEACH, not summarise.
  This is the single most important rule. You are not writing an abstract or
  revision notes — you are writing the lesson the student will learn from,
  because they will never see the original document.

  * Never condense. The lesson must cover its topic in at least as much depth
    as the source, and usually MORE, because slides and handouts are terse.
  * Expand every bullet point into full explanatory sentences. A slide reading
    "Cost, quality, delivery" becomes a paragraph explaining what each factor
    means, why it matters and how they trade off against each other.
  * Carry over EVERY definition, example, figure, percentage, step, list item,
    caveat and piece of terminology that appears in the source for that topic.
    Losing detail is a failure, even if the result reads more neatly.
  * Where the source states something without explaining it, explain it using
    ordinary domain knowledge any competent instructor would supply — but never
    invent specifics such as statistics, named cases, dates or study results.
  * Write flowing prose in short paragraphs. Use a bulleted list only where the
    source genuinely lists things, and still explain each item.
  * LENGTH IS A HARD REQUIREMENT. Every bodyText must be at least 300 words.
    A lesson drawn from several pages should run to 600-900 words. A lesson of
    100 words is a failed lesson, however tidy it reads — the student is left
    with slide bullets rather than teaching. Before finishing each lesson, count
    the words and keep writing if it is under 300.
  * To reach that depth honestly, do not repeat yourself. Explain the idea, then
    why it matters in practice, then what it looks like when applied, then the
    common mistake or trade-off. That structure fills the space with substance.
- Ignore artefacts of the source file: page furniture, headers/footers, slide
  numbers, "[Page 3]" markers, tables of contents and copyright notices.
- Write in clear British/international English suited to adult learners.

Every lesson also gets a short quiz that a student must pass before moving on.
The quiz is sat on a separate screen with the notes hidden, so it must test
understanding rather than recall of a sentence the student can copy:
- EXACTLY {{QUIZ_COUNT}} multiple-choice questions, each with exactly four
  options. Not fewer. If the lesson feels thin for {{QUIZ_COUNT}} questions,
  cover it from more angles — definitions, application, comparison, sequence,
  and common misunderstandings — rather than writing fewer.
- Every question must be answerable from that lesson's bodyText alone. Never
  test something the lesson does not teach.
- Do not ask the same thing twice in different words.
- Prefer questions that apply the idea — a short scenario, choosing the right
  action, spotting which statement is wrong, or explaining why something is so.
- Avoid questions answerable by pattern-matching a phrase, and never quote a
  whole sentence from the lesson as the correct option.
- Wrong options must be plausible, not obviously silly, and all four options
  should be similar in length and style so the answer isn't guessable.
- Vary which position holds the correct answer across questions.
- Set passScore to 70 unless the material is safety- or compliance-critical,
  where 80 is appropriate.
`.trim();

/** The system prompt with the requested quiz length baked in. */
function systemPrompt(questionCount = DEFAULT_QUIZ_QUESTIONS) {
  return SYSTEM_PROMPT_TEMPLATE.replaceAll('{{QUIZ_COUNT}}', String(clampQuestionCount(questionCount)));
}

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
      max_tokens: MAX_OUTPUT_TOKENS,
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

// Any lesson shorter than this is treated as having been summarised, and is
// sent back to be rewritten at full depth against the original source.
const MIN_LESSON_WORDS = Number(process.env.AI_MIN_LESSON_WORDS) || 280;
const MAX_EXPANSIONS = Number(process.env.AI_MAX_EXPANSIONS) || 40;

const EXPANSION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['bodyText'],
  properties: {
    bodyText: { type: 'string', description: 'The rewritten, full-length lesson notes.' }
  }
};

const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Second pass: rewrite any lesson that came back too short. Prompting alone
 * doesn't reliably stop the model compressing slide decks, so we measure the
 * result and insist on a proper rewrite where it fell short.
 */
async function expandShortLessons({ modules, sourceText, courseTitle, apiKey, model, usage, signal, questionCount }) {
  const short = [];
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      if (wordCount(lesson.bodyText) < MIN_LESSON_WORDS) short.push({ mod, lesson });
    }
  }
  if (!short.length) return { expanded: 0, skipped: 0 };

  const budget = short.slice(0, MAX_EXPANSIONS);
  let expanded = 0;

  for (const { mod, lesson } of budget) {
    try {
      const { parsed, usage: u } = await callOpenAI({
        apiKey,
        model,
        signal,
        schema: { name: 'expanded_lesson', schema: EXPANSION_SCHEMA },
        messages: [
          { role: 'system', content: systemPrompt(questionCount) },
          {
            role: 'user',
            content:
              `These notes for the lesson "${lesson.title}" (module "${mod.title}"` +
              `${courseTitle ? `, course "${courseTitle}"` : ''}) are too short — they summarise ` +
              `instead of teaching:\n\n---\n${lesson.bodyText}\n---\n\n` +
              `Rewrite them in full. Keep every point already there, then expand each into proper ` +
              `teaching prose: explain the idea, why it matters, what it looks like in practice, and ` +
              `the common mistake or trade-off. Draw only on the source material below and ordinary ` +
              `domain knowledge — invent no statistics, cases, dates or studies. The result must be ` +
              `at least ${MIN_LESSON_WORDS + 70} words.\n\n` +
              `SOURCE MATERIAL:\n---\n${sourceText.slice(0, MAX_CHARS_PER_CALL)}\n---`
          }
        ]
      });

      const rewritten = parsed?.bodyText;
      // Only accept the rewrite if it is genuinely longer.
      if (rewritten && wordCount(rewritten) > wordCount(lesson.bodyText)) {
        lesson.bodyText = rewritten;
        expanded++;
      }
      usage.promptTokens += u.prompt_tokens || 0;
      usage.completionTokens += u.completion_tokens || 0;
      usage.calls += 1;
    } catch {
      // A failed expansion leaves the original lesson intact.
    }
  }

  return { expanded, skipped: short.length - budget.length };
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
export async function segmentIntoLessons({
  text, courseTitle = '', hint = '', signal, questionCount = DEFAULT_QUIZ_QUESTIONS
} = {}) {
  const quizCount = clampQuestionCount(questionCount);
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
        { role: 'system', content: systemPrompt(quizCount) },
        {
          role: 'user',
          content:
            `${context}\n\nSegment the following lecture material into modules and lessons.\n\n` +
            `---\n${chunks[i]}\n---\n\n` +
            `Reminder: the student never sees the document above — your bodyText IS the lesson. ` +
            `Expand every bullet into full teaching prose and carry over every detail. ` +
            `Each bodyText must be at least 300 words; do not summarise. ` +
            `Every quiz must contain exactly ${quizCount} questions.`
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

  // Catch and repair any lesson that came back summarised.
  const depth = await expandShortLessons({
    modules, sourceText: text, courseTitle, apiKey, model, usage, signal, questionCount: quizCount
  });

  const lengths = modules.flatMap((m) => m.lessons.map((l) => wordCount(l.bodyText)));
  const shortest = lengths.length ? Math.min(...lengths) : 0;
  const average = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;

  return {
    modules,
    usage,
    model,
    chunks: chunks.length,
    depth: { ...depth, minWords: shortest, avgWords: average, target: MIN_LESSON_WORDS }
  };
}

/**
 * Build a quiz for one existing lesson from its own notes.
 * Used to backfill lessons that were created before quizzes existed.
 */
export async function generateQuizForLesson({
  title, bodyText, courseTitle = '', questionCount = DEFAULT_QUIZ_QUESTIONS
} = {}) {
  const quizCount = clampQuestionCount(questionCount);
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
      { role: 'system', content: systemPrompt(quizCount) },
      {
        role: 'user',
        content:
          `${courseTitle ? `Course: "${courseTitle}".\n` : ''}` +
          `Write the quiz for the lesson "${title}". It must contain exactly ${quizCount} ` +
          `questions, all answerable from these lesson notes alone:\n\n---\n` +
          `${text.slice(0, MAX_CHARS_PER_CALL)}\n---`
      }
    ]
  });

  const quiz = sanitiseQuiz(parsed);
  if (!quiz) throw new Error(`Could not build a usable quiz for "${title}".`);
  return { quiz, usage, requested: quizCount, produced: quiz.questions.length };
}
