import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getCourse, updateCourse, listLessons, createLesson, updateLesson, deleteLesson,
  getQuiz, upsertQuiz
} from '../../lib/courses.js';
import Spinner from '../../components/Spinner.jsx';

export default function AdminCourseEditor() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details');

  async function refresh() {
    setCourse(await getCourse(courseId));
    setLessons(await listLessons(courseId));
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [courseId]);

  if (loading) return <Spinner />;
  if (!course) return <p>Course not found.</p>;

  return (
    <div>
      <div className="mb-2">
        <Link to="/admin/courses" className="text-sm text-gray-500">← All courses</Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">{course.title}</h1>
        <button
          onClick={async () => {
            await updateCourse(courseId, { isPublished: !course.isPublished });
            toast.success(course.isPublished ? 'Unpublished' : 'Published');
            refresh();
          }}
          className={course.isPublished ? 'btn-secondary' : 'btn-primary'}
        >
          {course.isPublished ? 'Unpublish' : 'Publish course'}
        </button>
      </div>

      <div className="flex gap-2 border-b mb-6">
        {['details', 'lessons'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'details' ? 'Details' : 'Lessons & quizzes'}
          </button>
        ))}
      </div>

      {tab === 'details' && <CourseDetailsForm course={course} onSave={refresh} />}
      {tab === 'lessons' && (
        <LessonsManager
          courseId={courseId}
          lessons={lessons}
          onChange={refresh}
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
    <form onSubmit={handleSave} className="card p-6 space-y-3 grid sm:grid-cols-2 gap-3">
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
        <label className="label">Cover image URL</label>
        <input className="input" value={form.coverImageUrl} onChange={(e) => setForm((s) => ({ ...s, coverImageUrl: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Short description</label>
        <input className="input" value={form.shortDescription} onChange={(e) => setForm((s) => ({ ...s, shortDescription: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Full description</label>
        <textarea rows={5} className="input" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Learning outcomes (one per line)</label>
        <textarea rows={4} className="input" value={form.learningOutcomes} onChange={(e) => setForm((s) => ({ ...s, learningOutcomes: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

function LessonsManager({ courseId, lessons, onChange }) {
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);

  async function handleSaveLesson(form) {
    const payload = {
      title: form.title,
      description: form.description,
      videoUrl: form.videoUrl,
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
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{lessons.length} lessons</h2>
        <button onClick={() => { setEditingLesson(null); setShowLessonForm(true); }} className="btn-primary">+ Add lesson</button>
      </div>

      {lessons.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No lessons yet.</div>
      ) : (
        <div className="card divide-y">
          {lessons.map((l, i) => (
            <div key={l.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-semibold">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{l.title}</p>
                  <p className="text-xs text-gray-500 truncate">{l.videoUrl || '— no video —'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => openQuizFor(l)} className="text-brand-700 hover:underline">Quiz</button>
                <button onClick={() => { setEditingLesson(l); setShowLessonForm(true); }} className="text-gray-700 hover:underline">Edit</button>
                <button onClick={() => handleDeleteLesson(l)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLessonForm && (
        <LessonForm
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

function LessonForm({ lesson, defaultOrder, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    videoUrl: lesson?.videoUrl || '',
    durationMinutes: lesson?.durationMinutes || '',
    orderIndex: lesson?.orderIndex ?? defaultOrder
  });
  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="card max-w-lg w-full p-6 space-y-3"
      >
        <h3 className="text-lg font-display font-bold">{lesson ? 'Edit lesson' : 'New lesson'}</h3>
        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
        </div>
        <div>
          <label className="label">YouTube / Vimeo URL</label>
          <input className="input" value={form.videoUrl} onChange={(e) => setForm((s) => ({ ...s, videoUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
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
        <div>
          <label className="label">Description / notes</label>
          <textarea rows={4} className="input" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Save lesson</button>
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
    <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40 overflow-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card max-w-2xl w-full p-6 my-8 space-y-4">
        <h3 className="text-lg font-display font-bold">Quiz for: {lesson.title}</h3>
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
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="border rounded-lg p-3 space-y-2 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">Question {qi + 1}</p>
                <button onClick={() => removeQuestion(qi)} className="text-red-600 text-sm">Remove</button>
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
        <button onClick={addQuestion} className="btn-secondary w-full">+ Add question</button>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSubmit({ title, passScore, questions })} className="btn-primary flex-1">Save quiz</button>
        </div>
      </div>
    </div>
  );
}
