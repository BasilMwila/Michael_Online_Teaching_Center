import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { getCourse, listLessons, getQuiz, youtubeEmbedUrl } from '../../lib/courses.js';
import { getEnrollmentForCourse, markLessonCompleted } from '../../lib/enrollments.js';
import { submitQuizAttempt, scoreQuiz } from '../../lib/quizzes.js';
import Spinner from '../../components/Spinner.jsx';

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const current = useMemo(() => {
    if (!lessons.length) return null;
    if (!lessonId) return lessons[0];
    return lessons.find((l) => l.id === lessonId) || lessons[0];
  }, [lessons, lessonId]);

  useEffect(() => {
    (async () => {
      try {
        const [c, ls, en] = await Promise.all([
          getCourse(courseId),
          listLessons(courseId),
          getEnrollmentForCourse(firebaseUser.uid, courseId)
        ]);
        setCourse(c);
        setLessons(ls);
        setEnrollment(en);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, firebaseUser]);

  useEffect(() => {
    if (!current) return;
    setAnswers({});
    setResult(null);
    getQuiz(courseId, current.id).then(setQuiz);
  }, [current, courseId]);

  if (loading) return <Spinner />;
  if (!course) return <p className="p-8 text-center">Course not found.</p>;
  if (!enrollment || enrollment.status !== 'active') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">🔒 Access locked</h2>
        <p className="text-gray-600 mb-6">
          {enrollment?.status === 'pending_payment'
            ? 'Your payment is still pending. Once confirmed, the course will unlock here.'
            : 'You are not enrolled in this course yet.'}
        </p>
        {enrollment?.status === 'pending_payment' ? (
          <Link to={`/pay/${enrollment.id}`} className="btn-primary">Complete payment</Link>
        ) : (
          <Link to={`/courses/${courseId}`} className="btn-primary">View course</Link>
        )}
      </div>
    );
  }

  const completedSet = new Set(enrollment.completedLessons || []);
  const isCompleted = current ? completedSet.has(current.id) : false;
  const currentIndex = lessons.findIndex((l) => l.id === current?.id);
  const next = currentIndex >= 0 ? lessons[currentIndex + 1] : null;
  const prev = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  async function markComplete() {
    if (!current || isCompleted) return;
    await markLessonCompleted(enrollment.id, current.id, lessons.length);
    setEnrollment((e) => ({
      ...e,
      completedLessons: [...(e.completedLessons || []), current.id],
      progressPercent: Math.round(((e.completedLessons?.length || 0) + 1) / lessons.length * 100)
    }));
    toast.success('Lesson marked complete');
  }

  async function handleQuizSubmit(e) {
    e.preventDefault();
    if (!quiz) return;
    setSubmitting(true);
    try {
      const res = scoreQuiz(quiz, answers);
      await submitQuizAttempt({
        userId: firebaseUser.uid,
        quizId: quiz.id,
        courseId,
        lessonId: current.id,
        answers,
        result: res
      });
      setResult(res);
      if (res.passed) {
        await markComplete();
      } else {
        toast.error(`You scored ${res.percent}% — passing is ${quiz.passScore || 70}%`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto container-px py-8 grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-brand-700">← Back to dashboard</Link>
        <h1 className="text-2xl font-display font-bold mt-2 mb-1">{course.title}</h1>
        {current && <h2 className="text-lg text-gray-700 mb-4">Lesson {currentIndex + 1}: {current.title}</h2>}

        {current?.videoUrl ? (
          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
            <iframe
              key={current.id}
              src={youtubeEmbedUrl(current.videoUrl)}
              title={current.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gray-100 rounded-xl grid place-items-center text-gray-500">No video yet for this lesson.</div>
        )}

        {current?.description && (
          <div className="card p-5 mt-5 whitespace-pre-line text-gray-700">{current.description}</div>
        )}

        {quiz && quiz.questions?.length > 0 && (
          <div className="card p-6 mt-6">
            <h3 className="font-display font-bold text-lg mb-4">Quiz: {quiz.title || 'Lesson check'}</h3>
            {result ? (
              <div className={`p-4 rounded-lg mb-4 ${result.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                <p className="font-semibold">{result.passed ? '🎉 Passed!' : '🔁 Try again'}</p>
                <p className="text-sm">Score: {result.percent}% ({result.correct} / {result.total})</p>
              </div>
            ) : null}
            <form onSubmit={handleQuizSubmit} className="space-y-5">
              {quiz.questions.map((q, qi) => (
                <fieldset key={qi}>
                  <legend className="font-medium mb-2">{qi + 1}. {q.questionText}</legend>
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name={`q${qi}`}
                          value={oi}
                          checked={answers[qi] === oi}
                          onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                          className="text-brand-600"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Submitting…' : result ? 'Try again' : 'Submit quiz'}
                </button>
                {result && !result.passed && (
                  <button type="button" onClick={() => { setResult(null); setAnswers({}); }} className="btn-secondary">Reset</button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <div>
            {prev && <Link to={`/learn/${courseId}/${prev.id}`} className="btn-secondary">← {prev.title}</Link>}
          </div>
          <div className="flex gap-2">
            {!isCompleted && <button onClick={markComplete} className="btn-ghost">Mark complete</button>}
            {isCompleted && <span className="text-emerald-600 font-medium px-3 py-2">✓ Completed</span>}
            {next && <Link to={`/learn/${courseId}/${next.id}`} className="btn-primary">Next: {next.title} →</Link>}
            {!next && enrollment.progressPercent === 100 && (
              <button onClick={() => navigate('/submit-testimonial')} className="btn-primary">Leave a testimonial →</button>
            )}
          </div>
        </div>
      </div>

      <aside className="card p-4 h-fit lg:sticky lg:top-20">
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Course progress</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${enrollment.progressPercent || 0}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{enrollment.progressPercent || 0}% — {completedSet.size}/{lessons.length} lessons</p>
        </div>
        <ol className="divide-y">
          {lessons.map((l, i) => {
            const done = completedSet.has(l.id);
            const active = l.id === current?.id;
            return (
              <li key={l.id}>
                <Link
                  to={`/learn/${courseId}/${l.id}`}
                  className={`flex items-center gap-3 p-3 rounded ${active ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                >
                  <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={`text-sm flex-1 ${active ? 'font-semibold text-brand-700' : 'text-gray-700'}`}>{l.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
