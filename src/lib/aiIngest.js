// Upload a lecture document and turn the AI's outline into course lessons.

import { apiGet, apiPost, apiUpload } from './apiClient.js';
import { createLesson, upsertQuiz } from './courses.js';

/** Whether the server has the AI import configured (key + admin allowlist). */
export function getAiStatus() {
  return apiGet('/ai/status');
}

/** Send a PDF/PPTX/DOCX for segmentation. Resolves to { modules, source, meta }. */
export function segmentDocument({ file, courseTitle, hint, onProgress, signal }) {
  return apiUpload('/ai/segment', {
    file,
    fields: { courseTitle, hint },
    onProgress,
    signal
  });
}

/**
 * Flatten reviewed modules into ordered lesson records.
 * `startOrder` continues numbering after any lessons the course already has.
 */
export function flattenModules(modules, startOrder = 0) {
  const out = [];
  let order = startOrder;
  for (const mod of modules) {
    for (const lesson of mod.lessons || []) {
      out.push({
        module: mod.title || '',
        moduleSummary: mod.summary || '',
        title: lesson.title || 'Untitled lesson',
        summary: lesson.summary || '',
        bodyText: lesson.bodyText || '',
        keyPoints: lesson.keyPoints || [],
        durationMinutes: Number(lesson.durationMinutes) || null,
        quiz: lesson.quiz || null,
        orderIndex: order++
      });
    }
  }
  return out;
}

/**
 * Write the approved lessons into the course, one after another so their
 * order is preserved. Reports progress as each lesson is saved.
 */
export async function saveLessonsToCourse(courseId, lessons, onProgress) {
  const created = [];
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    const id = await createLesson(courseId, {
      title: l.title,
      summary: l.summary,
      module: l.module,
      bodyText: buildBodyText(l),
      keyPoints: l.keyPoints,
      durationMinutes: l.durationMinutes,
      orderIndex: l.orderIndex,
      videoUrl: '',
      videoIsUpload: false,
      resources: [],
      source: 'ai-import'
    });

    // The lesson's quiz is what gates progress to the next lesson.
    if (l.quiz?.questions?.length) {
      await upsertQuiz(courseId, id, {
        title: `Quiz: ${l.title}`,
        passScore: l.quiz.passScore || 70,
        questions: l.quiz.questions,
        source: 'ai-import'
      });
    }

    created.push(id);
    onProgress?.(i + 1, lessons.length);
  }
  return created;
}

/** Ask the AI for a quiz covering one existing lesson. */
export function generateQuizForLesson({ title, bodyText, courseTitle }) {
  return apiPost('/ai/quiz', { title, bodyText, courseTitle });
}

/** Append key points to the lesson notes so they render in the player. */
function buildBodyText(lesson) {
  if (!lesson.keyPoints?.length) return lesson.bodyText;
  const points = lesson.keyPoints.map((p) => `• ${p}`).join('\n');
  return `${lesson.bodyText}\n\nKey points\n${points}`;
}
