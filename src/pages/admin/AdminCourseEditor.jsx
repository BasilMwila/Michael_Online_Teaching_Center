import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getCourse, updateCourse, listLessons, createLesson, updateLesson, deleteLesson,
  getQuiz, upsertQuiz, listQuizzesByLesson
} from '../../lib/courses.js';
import { generateQuizForLesson, generateNarration } from '../../lib/aiIngest.js';
import FileUploader from '../../components/FileUploader.jsx';
import DocumentToLessons from '../../components/DocumentToLessons.jsx';
import Icon from '../../components/Icon.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function AdminCourseEditor() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details');

  async function refresh() {
    setCourse(await getCourse(courseId));
    setLessons(await listLessons(courseId));
    setQuizzes(await listQuizzesByLesson(courseId));
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [courseId]);

  if (loading) return <Spinner />;
  if (!course) return <p>Course not found.</p>;

  return (
    <div>
      <div className="mb-2">
        <Link to="/admin/courses" className="text-sm text-ink-500 hover:text-ink-800 inline-flex items-center gap-1">
          <Icon name="arrow-right" size={14} className="rotate-180" /> All courses
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold">{course.title}</h1>
        <button
          onClick={async () => {
            await updateCourse(courseId, { isPublished: !course.isPublished });
            toast.success(course.isPublished ? 'Unpublished' : 'Published');
            refresh();
          }}
          className={course.isPublished ? 'btn-secondary' : 'btn-primary'}
        >
          <Icon name={course.isPublished ? 'lock' : 'sparkles'} size={16} />
          {course.isPublished ? 'Unpublish' : 'Publish course'}
        </button>
      </div>

      <div className="flex gap-1 border-b border-ink-100 mb-6">
        {[
          { id: 'details', label: 'Details', icon: 'book-open' },
          { id: 'lessons', label: 'Lessons & quizzes', icon: 'video' },
          { id: 'ai', label: 'AI import', icon: 'sparkles' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-2 ${
              tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <Icon name={t.icon} size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && <CourseDetailsForm course={course} onSave={refresh} />}
      {tab === 'lessons' && (
        <LessonsManager
          courseId={courseId}
          courseTitle={course.title}
          lessons={lessons}
          quizzes={quizzes}
          onChange={refresh}
        />
      )}
      {tab === 'ai' && (
        <DocumentToLessons
          courseId={courseId}
          courseTitle={course.title}
          existingCount={lessons.length}
          onImported={() => { refresh(); setTab('lessons'); }}
        />
      )}
    </div>
  );
}

function CourseDetailsForm({ course, onSave }) {
  const [form, setForm] = useState({
    title: course.title || '',
    shortDescription: course.shortDescription || '',
    description: course.description || '',
    category: course.category || '',
    mode: course.mode || 'self_paced',
    price: ((course.priceCents || 0) / 100).toString(),
    currency: course.currency || 'USD',
    durationHours: course.durationHours || '',
    instructorName: course.instructorName || '',
    coverImageUrl: course.coverImageUrl || '',
    learningOutcomes: (course.learningOutcomes || []).join('\n')
  });
  const [busy, setBusy] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateCourse(course.id, {
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        category: form.category,
        mode: form.mode,
        priceCents: Math.round(Number(form.price) * 100),
        currency: form.currency,
        durationHours: Number(form.durationHours) || null,
        instructorName: form.instructorName,
        coverImageUrl: form.coverImageUrl,
        learningOutcomes: form.learningOutcomes.split('\n').map((s) => s.trim()).filter(Boolean)
      });
      toast.success('Saved');
      onSave?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
        </div>
        <div>
          <label className="label">Mode</label>
          <select className="input" value={form.mode} onChange={(e) => setForm((s) => ({ ...s, mode: e.target.value }))}>
            <option value="self_paced">Self-paced</option>
            <option value="live">Live class</option>
          </select>
        </div>
        <div>
          <label className="label">Price</label>
          <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input className="input" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} />
        </div>
        <div>
          <label className="label">Duration (hours)</label>
          <input type="number" className="input" value={form.durationHours} onChange={(e) => setForm((s) => ({ ...s, durationHours: e.target.value }))} />
        </div>
        <div>
          <label className="label">Instructor</label>
          <input className="input" value={form.instructorName} onChange={(e) => setForm((s) => ({ ...s, instructorName: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <FileUploader
            label="Cover image"
            accept="image"
            folder={`courseAssets/${course.id}`}
            resourceType="image"
            currentUrl={form.coverImageUrl}
            onUploaded={({ url }) => setForm((s) => ({ ...s, coverImageUrl: url }))}
            onClear={() => setForm((s) => ({ ...s, coverImageUrl: '' }))}
            helperText="Recommended 1280×720 · max 10MB"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Short description</label>
          <input className="input" value={form.shortDescription} onChange={(e) => setForm((s) => ({ ...s, shortDescription: e.target.value }))} placeholder="One sentence pitch" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Full description</label>
          <textarea rows={5} className="input" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Learning outcomes (one per line)</label>
          <textarea rows={4} className="input" value={form.learningOutcomes} onChange={(e) => setForm((s) => ({ ...s, learningOutcomes: e.target.value }))} />
        </div>
      </div>
      <button disabled={busy} className="btn-primary">
        <Icon name="check" size={16} />{busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function LessonsManager({ courseId, courseTitle, lessons, quizzes = {}, onChange }) {
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [generating, setGenerating] = useState(null);

  const missingQuiz = lessons.filter((l) => !quizzes[l.id]?.questions?.length && l.bodyText);
  const missingAudio = lessons.filter((l) => !l.audioUrl && l.bodyText);

  async function generateMissingNarration() {
    if (!missingAudio.length) return;
    let made = 0;
    const failures = [];
    for (let i = 0; i < missingAudio.length; i++) {
      const l = missingAudio[i];
      setGenerating({ done: i, total: missingAudio.length, title: l.title, kind: 'narration' });
      try {
        const { audioUrl, seconds } = await generateNarration({ title: l.title, bodyText: l.bodyText });
        await updateLesson(courseId, l.id, { audioUrl, audioSeconds: seconds || null });
        made++;
      } catch (err) {
        failures.push(`${l.title}: ${err.message}`);
      }
    }
    setGenerating(null);
    if (made) toast.success(`${made} lesson${made === 1 ? '' : 's'} narrated`);
    if (failures.length) toast.error(`${failures.length} could not be narrated. ${failures[0]}`);
    onChange?.();
  }

  async function generateMissingQuizzes() {
    if (!missingQuiz.length) return;
    let made = 0;
    const failures = [];
    for (let i = 0; i < missingQuiz.length; i++) {
      const l = missingQuiz[i];
      setGenerating({ done: i, total: missingQuiz.length, title: l.title, kind: 'quiz' });
      try {
        const { quiz } = await generateQuizForLesson({
          title: l.title,
          bodyText: l.bodyText,
          courseTitle
        });
        await upsertQuiz(courseId, l.id, {
          title: `Quiz: ${l.title}`,
          passScore: quiz.passScore || 70,
          questions: quiz.questions,
          source: 'ai-import'
        });
        made++;
      } catch (err) {
        failures.push(`${l.title}: ${err.message}`);
      }
    }
    setGenerating(null);
    if (made) toast.success(`${made} quiz${made === 1 ? '' : 'zes'} generated`);
    if (failures.length) toast.error(`${failures.length} could not be generated. ${failures[0]}`);
    onChange?.();
  }

  async function handleSaveLesson(form) {
    const payload = {
      title: form.title,
      bodyText: form.bodyText,
      videoUrl: form.videoUrl,
      videoIsUpload: form.videoIsUpload,
      resources: form.resources,
      durationMinutes: Number(form.durationMinutes) || null,
      orderIndex: Number(form.orderIndex) || 0
    };
    if (editingLesson) {
      await updateLesson(courseId, editingLesson.id, payload);
      toast.success('Lesson updated');
    } else {
      await createLesson(courseId, payload);
      toast.success('Lesson added');
    }
    setShowLessonForm(false);
    setEditingLesson(null);
    onChange?.();
  }

  async function handleDeleteLesson(l) {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    await deleteLesson(courseId, l.id);
    toast.success('Lesson deleted');
    onChange?.();
  }

  async function openQuizFor(lesson) {
    const existing = await getQuiz(courseId, lesson.id);
    setEditingQuiz({ lesson, quiz: existing || { questions: [], passScore: 70 } });
  }

  async function handleSaveQuiz(quizData) {
    await upsertQuiz(courseId, editingQuiz.lesson.id, {
      title: quizData.title || `Quiz: ${editingQuiz.lesson.title}`,
      passScore: Number(quizData.passScore) || 70,
      questions: quizData.questions
    });
    toast.success('Quiz saved');
    setEditingQuiz(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-lg font-semibold">
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          {lessons.length > 0 && (
            <span className="ml-2 text-sm font-normal text-ink-500">
              · {lessons.length - missingQuiz.length} with a quiz
            </span>
          )}
        </h2>
        <button onClick={() => { setEditingLesson(null); setShowLessonForm(true); }} className="btn-primary">
          <Icon name="sparkles" size={16} />Add lesson
        </button>
      </div>

      {missingAudio.length > 0 && (
        <div className="card p-5 border-l-4 border-brand-600">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">
                {missingAudio.length} lesson{missingAudio.length === 1 ? '' : 's'} without narration
              </p>
              <p className="text-sm text-ink-600 mt-1 max-w-xl leading-relaxed">
                Reads each lesson&rsquo;s notes aloud and attaches the audio, so students can listen
                instead of read. Takes a few seconds per lesson and costs a fraction of a penny.
              </p>
              {generating?.kind === 'narration' && (
                <p className="text-sm text-brand-700 mt-2">
                  Narrating {generating.done + 1} of {generating.total} &mdash; {generating.title}…
                </p>
              )}
            </div>
            <button onClick={generateMissingNarration} disabled={!!generating} className="btn-primary flex-shrink-0">
              <Icon name="video" size={16} />
              {generating?.kind === 'narration' ? 'Narrating…' : 'Narrate lessons with AI'}
            </button>
          </div>
          {generating?.kind === 'narration' && (
            <div className="mt-3 w-full bg-ink-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all"
                style={{ width: `${(generating.done / generating.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {missingQuiz.length > 0 && (
        <div className="card p-5 border-l-4 border-accent-500">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">
                {missingQuiz.length} lesson{missingQuiz.length === 1 ? '' : 's'} without a quiz
              </p>
              <p className="text-sm text-ink-600 mt-1 max-w-xl leading-relaxed">
                Students must pass a lesson&rsquo;s quiz before the next lesson unlocks. Lessons
                with no quiz only need &ldquo;Mark complete&rdquo;.
              </p>
              {generating?.kind === 'quiz' && (
                <p className="text-sm text-brand-700 mt-2">
                  Writing quiz {generating.done + 1} of {generating.total} &mdash; {generating.title}…
                </p>
              )}
            </div>
            <button onClick={generateMissingQuizzes} disabled={!!generating} className="btn-primary flex-shrink-0">
              <Icon name="sparkles" size={16} />
              {generating?.kind === 'quiz' ? 'Generating…' : 'Generate quizzes with AI'}
            </button>
          </div>
          {generating?.kind === 'quiz' && (
            <div className="mt-3 w-full bg-ink-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all"
                style={{ width: `${(generating.done / generating.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {lessons.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="icon-tile w-14 h-14 mx-auto bg-brand-50 text-brand-600 mb-4">
            <Icon name="video" size={24} />
          </div>
          <p className="text-ink-600">No lessons yet. Add your first lesson to get started.</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {lessons.map((l, i) => (
            <div key={l.id} className="p-4 flex items-center justify-between gap-3 hover:bg-ink-50/50 transition">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center text-sm font-bold flex-shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900 truncate">{l.title}</p>
                  <div className="flex items-center gap-3 text-xs text-ink-500 mt-0.5 flex-wrap">
                    {l.videoUrl ? (
                      <span className="inline-flex items-center gap-1 text-brand-700 font-medium"><Icon name="video" size={12} />Video</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-ink-400"><Icon name="video" size={12} />No video</span>
                    )}
                    {l.bodyText && <span className="inline-flex items-center gap-1"><Icon name="book-open" size={12} />Notes</span>}
                    {l.resources?.length > 0 && <span className="inline-flex items-center gap-1"><Icon name="book-open" size={12} />{l.resources.length} resource{l.resources.length !== 1 ? 's' : ''}</span>}
                    {l.durationMinutes && <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} />{l.durationMinutes} min</span>}
                    {l.audioUrl && (
                      <span className="inline-flex items-center gap-1 text-brand-700 font-medium">
                        <Icon name="play-circle" size={12} />Narrated
                      </span>
                    )}
                    {quizzes[l.id]?.questions?.length ? (
                      <span className="inline-flex items-center gap-1 text-brand-700 font-medium">
                        <Icon name="check" size={12} />{quizzes[l.id].questions.length}-question quiz
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-accent-700">
                        <Icon name="lock" size={12} />No quiz
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <button onClick={() => openQuizFor(l)} className="px-3 py-1.5 rounded-md text-brand-700 hover:bg-brand-50 font-medium">Quiz</button>
                <button onClick={() => { setEditingLesson(l); setShowLessonForm(true); }} className="px-3 py-1.5 rounded-md text-ink-700 hover:bg-ink-100 font-medium">Edit</button>
                <button onClick={() => handleDeleteLesson(l)} className="px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLessonForm && (
        <LessonForm
          courseId={courseId}
          lesson={editingLesson}
          defaultOrder={lessons.length + 1}
          onClose={() => { setShowLessonForm(false); setEditingLesson(null); }}
          onSubmit={handleSaveLesson}
        />
      )}
      {editingQuiz && (
        <QuizEditor
          lesson={editingQuiz.lesson}
          quiz={editingQuiz.quiz}
          onClose={() => setEditingQuiz(null)}
          onSubmit={handleSaveQuiz}
        />
      )}
    </div>
  );
}

function LessonForm({ courseId, lesson, defaultOrder, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: lesson?.title || '',
    bodyText: lesson?.bodyText || '',
    videoUrl: lesson?.videoUrl || '',
    videoIsUpload: lesson?.videoIsUpload || false,
    resources: lesson?.resources || [],
    durationMinutes: lesson?.durationMinutes || '',
    orderIndex: lesson?.orderIndex ?? defaultOrder
  });
  const [videoMode, setVideoMode] = useState(lesson?.videoIsUpload ? 'upload' : 'embed');

  function addResource({ url, name, sizeBytes, type }) {
    setForm((s) => ({
      ...s,
      resources: [...(s.resources || []), { url, name, sizeBytes, type, kind: type?.startsWith('image/') ? 'image' : 'pdf' }]
    }));
  }
  function removeResource(idx) {
    setForm((s) => ({ ...s, resources: s.resources.filter((_, i) => i !== idx) }));
  }

  return (
    <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm grid place-items-center p-4 z-40 overflow-auto animate-fade-in" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="card max-w-2xl w-full p-6 my-8 space-y-5 animate-slide-up"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-bold">{lesson ? 'Edit lesson' : 'New lesson'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-ink-100 rounded-lg"><Icon name="x" size={18} /></button>
        </div>

        <div>
          <label className="label">Lesson title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Order</label>
            <input type="number" className="input" value={form.orderIndex} onChange={(e) => setForm((s) => ({ ...s, orderIndex: e.target.value }))} />
          </div>
          <div>
            <label className="label">Duration (min)</label>
            <input type="number" className="input" value={form.durationMinutes} onChange={(e) => setForm((s) => ({ ...s, durationMinutes: e.target.value }))} />
          </div>
        </div>

        {/* VIDEO SECTION */}
        <div>
          <label className="label">Video</label>
          <div className="flex gap-1 p-1 bg-ink-100 rounded-lg mb-3">
            <button
              type="button"
              onClick={() => setVideoMode('embed')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${videoMode === 'embed' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600'}`}
            >
              Paste a video link
            </button>
            <button
              type="button"
              onClick={() => setVideoMode('upload')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${videoMode === 'upload' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600'}`}
            >
              Upload video file
            </button>
          </div>
          {videoMode === 'embed' ? (
            <>
              <input
                className="input"
                value={form.videoIsUpload ? '' : form.videoUrl}
                onChange={(e) => setForm((s) => ({ ...s, videoUrl: e.target.value, videoIsUpload: false }))}
                placeholder="https://www.youtube.com/watch?v=…  or  https://…/lesson.mp4"
              />
              <p className="text-xs text-ink-500 mt-1.5">
                YouTube or Vimeo links are embedded. A direct file link (ending .mp4, .webm, .mov —
                such as a SlideSpeak export) plays in the site&rsquo;s own player.
              </p>
            </>
          ) : (
            <FileUploader
              accept="video"
              folder={`courseAssets/${courseId}/lessons`}
              resourceType="video"
              currentUrl={form.videoIsUpload ? form.videoUrl : ''}
              onUploaded={({ url }) => setForm((s) => ({ ...s, videoUrl: url, videoIsUpload: true }))}
              onClear={() => setForm((s) => ({ ...s, videoUrl: '', videoIsUpload: false }))}
              helperText="MP4 / WebM · max 100MB · streamed via Cloudinary"
            />
          )}
        </div>

        {/* TEXT BODY */}
        <div>
          <label className="label">Lesson notes / text content (optional)</label>
          <textarea
            rows={6}
            className="input font-mono text-sm"
            value={form.bodyText}
            onChange={(e) => setForm((s) => ({ ...s, bodyText: e.target.value }))}
            placeholder="Write or paste the lesson notes here. Plain text or simple Markdown — line breaks are preserved."
          />
        </div>

        {/* RESOURCES */}
        <div>
          <label className="label">Downloadable resources (PDFs, images)</label>
          {form.resources?.length > 0 && (
            <ul className="space-y-2 mb-3">
              {form.resources.map((r, i) => (
                <li key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-ink-200 bg-ink-50">
                  <div className="icon-tile w-9 h-9 bg-white text-brand-700">
                    <Icon name={r.kind === 'image' ? 'sparkles' : 'book-open'} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-ink-500">{(r.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">View</a>
                  <button type="button" onClick={() => removeResource(i)} className="text-xs text-red-600 hover:underline">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <FileUploader
            accept="pdf"
            folder={`courseAssets/${courseId}/resources`}
            resourceType="auto"
            onUploaded={addResource}
            helperText="PDF · max 25MB. Add as many as you need."
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-ink-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">
            <Icon name="check" size={16} />Save lesson
          </button>
        </div>
      </form>
    </div>
  );
}

function QuizEditor({ lesson, quiz, onClose, onSubmit }) {
  const [title, setTitle] = useState(quiz.title || '');
  const [passScore, setPassScore] = useState(quiz.passScore || 70);
  const [questions, setQuestions] = useState(quiz.questions || []);

  function addQuestion() {
    setQuestions((qs) => [...qs, { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }]);
  }
  function updateQuestion(i, patch) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }
  function updateOption(qi, oi, value) {
    setQuestions((qs) => qs.map((q, idx) => {
      if (idx !== qi) return q;
      const options = [...q.options];
      options[oi] = value;
      return { ...q, options };
    }));
  }
  function removeQuestion(i) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm grid place-items-center p-4 z-40 overflow-auto animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card max-w-2xl w-full p-6 my-8 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-bold">Quiz · {lesson.title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-ink-100 rounded-lg"><Icon name="x" size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quiz title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Pass score (%)</label>
            <input type="number" className="input" value={passScore} onChange={(e) => setPassScore(e.target.value)} />
          </div>
        </div>
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {questions.map((q, qi) => (
            <div key={qi} className="border border-ink-200 rounded-xl p-4 space-y-2 bg-ink-50">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-sm">Question {qi + 1}</p>
                <button onClick={() => removeQuestion(qi)} className="text-red-600 text-xs hover:underline">Remove</button>
              </div>
              <input
                className="input"
                value={q.questionText}
                onChange={(e) => updateQuestion(qi, { questionText: e.target.value })}
                placeholder="Question text"
              />
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correctOptionIndex === oi}
                    onChange={() => updateQuestion(qi, { correctOptionIndex: oi })}
                    className="text-brand-600 w-4 h-4"
                  />
                  <input
                    className="input flex-1"
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <button onClick={addQuestion} className="btn-secondary w-full">
          <Icon name="sparkles" size={16} />Add question
        </button>
        <div className="flex gap-2 pt-2 border-t border-ink-100">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSubmit({ title, passScore, questions })} className="btn-primary flex-1">
            <Icon name="check" size={16} />Save quiz
          </button>
        </div>
      </div>
    </div>
  );
}
