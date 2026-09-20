import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { getCourse, listLessons, getQuiz, youtubeEmbedUrl, isDirectVideoUrl } from '../../lib/courses.js';
import { getEnrollmentForCourse, markLessonCompleted } from '../../lib/enrollments.js';
import { submitQuizAttempt, scoreQuiz } from '../../lib/quizzes.js';
import Icon from '../../components/Icon.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const quizMode = location.pathname.endsWith('/quiz');
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
    if (lessonId) return lessons.find((l) => l.id === lessonId) || lessons[0];
    // No lesson in the URL: resume at the first one still outstanding.
    const done = new Set(enrollment?.completedLessons || []);
    return lessons.find((l) => !done.has(l.id)) || lessons[0];
  }, [lessons, lessonId, enrollment]);

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
        <div className="icon-tile w-16 h-16 mx-auto bg-amber-100 text-amber-600 mb-5">
          <Icon name="lock" size={28} />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2 text-ink-900">Access locked</h2>
        <p className="text-ink-600 mb-6">
          {enrollment?.status === 'pending_payment'
            ? 'Your payment is still pending. Once confirmed, the course will unlock here.'
            : 'You are not enrolled in this course yet.'}
        </p>
        {enrollment?.status === 'pending_payment' ? (
          <Link to={`/pay/${enrollment.id}`} className="btn-primary">
            <Icon name="credit-card" size={16} />Complete payment
          </Link>
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

  // Lessons arrive ordered, so consecutive runs of the same module name form
  // the modules. Courses with no modules collapse to a single unnamed group.
  // A lesson is unlocked once every lesson before it is complete, so a student
  // has to pass each lesson's quiz before the next one opens. Already-completed
  // lessons stay open so they can revise.
  const firstIncomplete = lessons.findIndex((l) => !completedSet.has(l.id));
  const unlockedUpTo = firstIncomplete === -1 ? lessons.length - 1 : firstIncomplete;
  const isUnlocked = (index) => index <= unlockedUpTo;

  const nextLocked = next ? !isUnlocked(currentIndex + 1) : false;
  const hasQuiz = Boolean(quiz?.questions?.length);
  const currentLocked = currentIndex >= 0 && !isUnlocked(currentIndex);

  const modules = [];
  lessons.forEach((l, index) => {
    const name = l.module || '';
    const last = modules[modules.length - 1];
    if (last && last.name === name) last.lessons.push({ ...l, index });
    else modules.push({ name, lessons: [{ ...l, index }] });
  });
  const hasModules = modules.some((m) => m.name);

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

  // ---------- QUIZ SCREEN ----------
  // A separate page with the notes deliberately absent, so the quiz tests what
  // the student took in rather than what they can copy off the page.
  if (quizMode && current && !currentLocked) {
    return (
      <div className="max-w-3xl mx-auto container-px py-8">
        <Link
          to={`/learn/${courseId}/${current.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"
        >
          <Icon name="arrow-right" size={14} className="rotate-180" />Back to the lesson
        </Link>

        <div className="mt-4 mb-6">
          {current.module && (
            <p className="text-xs font-semibold text-accent-600 uppercase tracking-wider">{current.module}</p>
          )}
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900 mt-1">{current.title}</h1>
          <p className="text-ink-600 mt-1">Lesson {currentIndex + 1} of {lessons.length} · Quiz</p>
        </div>

        {!hasQuiz ? (
          <div className="card p-10 text-center">
            <p className="text-ink-600">There is no quiz for this lesson.</p>
            <Link to={`/learn/${courseId}/${current.id}`} className="btn-primary mt-5">Back to the lesson</Link>
          </div>
        ) : (
          <div className="card p-6 sm:p-8">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-50 border border-brand-100 mb-6">
              <Icon name="lock" size={18} className="text-brand-700 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-900 leading-relaxed">
                The lesson notes are hidden while you answer. Pass with{' '}
                <span className="font-semibold">{quiz.passScore || 70}%</span> or more to complete this lesson
                and unlock the next one. You can retake it as many times as you need.
              </p>
            </div>

            {result && (
              <div className={`p-5 rounded-xl mb-6 ${
                result.passed
                  ? 'bg-brand-50 text-brand-900 border border-brand-200'
                  : 'bg-accent-50 text-accent-900 border border-accent-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`icon-tile w-11 h-11 ${result.passed ? 'bg-brand-600 text-white' : 'bg-accent-500 text-brand-950'}`}>
                    <Icon name={result.passed ? 'check' : 'x'} size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-display font-bold text-lg">
                      {result.passed ? 'Passed — lesson complete' : 'Not quite yet'}
                    </p>
                    <p className="text-sm">
                      You scored {result.percent}% ({result.correct} of {result.total} correct) ·
                      pass mark {quiz.passScore || 70}%
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {result.passed ? (
                    next ? (
                      <Link to={`/learn/${courseId}/${next.id}`} className="btn-primary">
                        Start the next lesson<Icon name="arrow-right" size={16} />
                      </Link>
                    ) : (
                      <Link to="/dashboard" className="btn-primary">
                        Finish the course<Icon name="arrow-right" size={16} />
                      </Link>
                    )
                  ) : (
                    <>
                      <button onClick={() => { setResult(null); setAnswers({}); }} className="btn-primary">
                        <Icon name="arrow-right" size={16} />Try again
                      </button>
                      <Link to={`/learn/${courseId}/${current.id}`} className="btn-secondary">
                        Review the notes
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}

            {!result?.passed && (
              <form onSubmit={handleQuizSubmit} className="space-y-6">
                {quiz.questions.map((q, qi) => (
                  <fieldset key={qi}>
                    <legend className="font-medium mb-3 text-ink-900">{qi + 1}. {q.questionText}</legend>
                    <div className="space-y-2">
                      {(q.options || []).map((opt, oi) => (
                        <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          answers[qi] === oi ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/30'
                        }`}>
                          <input
                            type="radio"
                            name={`q${qi}`}
                            value={oi}
                            checked={answers[qi] === oi}
                            onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                            className="text-brand-600 w-4 h-4"
                          />
                          <span className="text-sm text-ink-800">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <button
                  type="submit"
                  disabled={submitting || Object.keys(answers).length < quiz.questions.length}
                  className="btn-primary w-full sm:w-auto"
                >
                  <Icon name="check" size={16} />
                  {submitting ? 'Checking…' : 'Submit answers'}
                </button>
                {Object.keys(answers).length < quiz.questions.length && (
                  <p className="text-xs text-ink-500">
                    Answer all {quiz.questions.length} questions to submit.
                  </p>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto container-px py-8 grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700">
          <Icon name="arrow-right" size={14} className="rotate-180" />Back to dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold mt-2 text-ink-900">{course.title}</h1>
        {current && (
          <>
            {current.module && (
              <p className="text-xs font-semibold text-accent-600 uppercase tracking-wider mt-2">{current.module}</p>
            )}
            <p className="text-ink-600 mb-4 mt-1">
              Lesson {currentIndex + 1} of {lessons.length} · <span className="font-medium text-ink-900">{current.title}</span>
            </p>
            {current.summary && <p className="text-ink-600 -mt-2 mb-4 text-sm">{current.summary}</p>}
          </>
        )}

        {/* A locked lesson reached by URL: show why, not the content. */}
        {currentLocked ? (
          <div className="card p-10 text-center">
            <div className="icon-tile w-16 h-16 mx-auto bg-accent-100 text-accent-700 mb-5">
              <Icon name="lock" size={28} />
            </div>
            <h2 className="text-xl font-display font-bold text-ink-900">This lesson is locked</h2>
            <p className="mt-2 text-ink-600 max-w-md mx-auto leading-relaxed">
              Work through the course in order — finish{' '}
              <span className="font-medium text-ink-900">{lessons[unlockedUpTo]?.title}</span>{' '}
              and pass its quiz to unlock this one.
            </p>
            <Link to={`/learn/${courseId}/${lessons[unlockedUpTo]?.id}`} className="btn-primary mt-6">
              Go to my current lesson
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        ) : (
        <>

        {/* VIDEO PLAYER */}
        {current?.videoUrl ? (
          (current.videoIsUpload || isDirectVideoUrl(current.videoUrl)) ? (
            <video
              key={current.id}
              src={current.videoUrl}
              controls
              controlsList="nodownload"
              className="w-full aspect-video bg-black rounded-2xl shadow-lift"
            />
          ) : (
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lift">
              <iframe
                key={current.id}
                src={youtubeEmbedUrl(current.videoUrl)}
                title={current.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )
        ) : null}

        {/* NARRATION — the lesson read aloud */}
        {current?.audioUrl && (
          <div className="card p-5 mt-6">
            <div className="flex items-center gap-2 mb-3 text-brand-700">
              <Icon name="play-circle" size={18} />
              <h3 className="font-semibold">Listen to this lesson</h3>
              {current.audioSeconds > 0 && (
                <span className="text-xs text-ink-500 font-normal">
                  {Math.floor(current.audioSeconds / 60)}:{String(Math.round(current.audioSeconds % 60)).padStart(2, '0')}
                </span>
              )}
            </div>
            <audio
              key={current.id}
              src={current.audioUrl}
              controls
              preload="none"
              className="w-full"
            />
            <p className="mt-2 text-xs text-ink-500">
              Prefer to read? The full notes are below.
            </p>
          </div>
        )}

        {/* TEXT BODY */}
        {current?.bodyText && (
          <div className="card p-6 mt-6">
            <div className="flex items-center gap-2 mb-4 text-brand-700">
              <Icon name="book-open" size={18} />
              <h3 className="font-semibold">Lesson notes</h3>
            </div>
            <div className="prose prose-sm max-w-none text-ink-700 leading-relaxed whitespace-pre-line">
              {current.bodyText}
            </div>
          </div>
        )}

        {/* RESOURCES */}
        {current?.resources?.length > 0 && (
          <div className="card p-6 mt-6">
            <div className="flex items-center gap-2 mb-4 text-brand-700">
              <Icon name="book-open" size={18} />
              <h3 className="font-semibold">Downloadable resources</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {current.resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 transition"
                >
                  <div className="icon-tile w-10 h-10 bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700">
                    <Icon name={r.kind === 'image' ? 'sparkles' : 'book-open'} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{r.name}</p>
                    {r.sizeBytes && <p className="text-xs text-ink-500">{(r.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>}
                  </div>
                  <Icon name="arrow-right" size={14} className="text-ink-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QUIZ — taken on its own page so the notes aren't visible */}
        {hasQuiz && (
          <div className={`card p-6 mt-6 border-l-4 ${isCompleted ? 'border-brand-600' : 'border-accent-500'}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-brand-700">
                  <Icon name={isCompleted ? 'check' : 'sparkles'} size={18} />
                  <h3 className="font-display font-bold text-lg">
                    {isCompleted ? 'Quiz passed' : 'Lesson check'}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-ink-600 leading-relaxed max-w-lg">
                  {isCompleted
                    ? `You've already passed this one. You can retake it any time to revise.`
                    : `${quiz.questions.length} questions, ${quiz.passScore || 70}% to pass. The quiz opens on its own page with these notes hidden, so read through them first.`}
                </p>
              </div>
              <Link
                to={`/learn/${courseId}/${current.id}/quiz`}
                className={`${isCompleted ? 'btn-secondary' : 'btn-primary'} flex-shrink-0`}
              >
                <Icon name="arrow-right" size={16} />
                {isCompleted ? 'Retake quiz' : 'Start the quiz'}
              </Link>
            </div>
          </div>
        )}

        {/* NAV BUTTONS */}
        <div className="flex items-center justify-between mt-8 flex-wrap gap-3">
          <div>
            {prev && (
              <Link to={`/learn/${courseId}/${prev.id}`} className="btn-secondary">
                <Icon name="arrow-right" size={16} className="rotate-180" />Previous
              </Link>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 text-brand-700 font-semibold px-3 py-2">
                <Icon name="check" size={16} />Completed
              </span>
            ) : hasQuiz ? (
              // The quiz is the only way past this lesson — no manual override.
              <Link to={`/learn/${courseId}/${current.id}/quiz`} className="btn-accent">
                <Icon name="check" size={16} />Take the quiz to continue
              </Link>
            ) : (
              <button onClick={markComplete} className="btn-ghost">
                <Icon name="check" size={16} />Mark complete
              </button>
            )}
            {next && (nextLocked ? (
              <span
                className="btn bg-ink-100 text-ink-400 cursor-not-allowed"
                title="Finish this lesson to unlock the next one"
              >
                <Icon name="lock" size={16} />Next lesson
              </span>
            ) : (
              <Link to={`/learn/${courseId}/${next.id}`} className="btn-primary">
                Next lesson <Icon name="arrow-right" size={16} />
              </Link>
            ))}
            {!next && enrollment.progressPercent === 100 && (
              <button onClick={() => navigate('/submit-testimonial')} className="btn-accent">
                <Icon name="star" size={16} />Leave a testimonial
              </button>
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {/* SIDEBAR */}
      <aside className="card p-4 h-fit lg:sticky lg:top-20">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Progress</p>
            <span className="text-xs font-bold text-brand-700">{enrollment.progressPercent || 0}%</span>
          </div>
          <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 h-2 rounded-full transition-all" style={{ width: `${enrollment.progressPercent || 0}%` }} />
          </div>
          <p className="text-xs text-ink-500 mt-1.5">
            {completedSet.size} of {lessons.length} lessons complete
            {hasModules && ` · ${modules.length} modules`}
          </p>
        </div>
        <div className="space-y-4">
          {modules.map((mod, mi) => {
            const doneInModule = mod.lessons.filter((l) => completedSet.has(l.id)).length;
            const moduleDone = doneInModule === mod.lessons.length;
            return (
              <div key={mi}>
                {mod.name && (
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <span className={`w-5 h-5 rounded-md grid place-items-center flex-shrink-0 ${
                      moduleDone ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
                    }`}>
                      {moduleDone
                        ? <Icon name="check" size={12} strokeWidth={3} />
                        : <span className="text-[9px] font-bold">{mi + 1}</span>}
                    </span>
                    <p className="text-xs font-bold text-ink-800 uppercase tracking-wide flex-1 leading-tight">{mod.name}</p>
                    <span className="text-[11px] font-semibold text-ink-500 flex-shrink-0">
                      {doneInModule}/{mod.lessons.length}
                    </span>
                  </div>
                )}
                <ol className={`space-y-0.5 ${mod.name ? 'pl-1.5 border-l-2 border-ink-100 ml-2' : ''}`}>
                  {mod.lessons.map((l) => {
                    const done = completedSet.has(l.id);
                    const active = l.id === current?.id;
                    const locked = !isUnlocked(l.index);

                    const badge = (
                      <span className={`w-7 h-7 rounded-lg grid place-items-center text-xs font-bold flex-shrink-0 ${
                        done ? 'bg-brand-600 text-white'
                          : active ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500'
                          : locked ? 'bg-ink-50 text-ink-300'
                          : 'bg-ink-100 text-ink-600'
                      }`}>
                        {done ? <Icon name="check" size={14} strokeWidth={2.5} />
                          : locked ? <Icon name="lock" size={12} />
                          : l.index + 1}
                      </span>
                    );

                    if (locked) {
                      return (
                        <li key={l.id}>
                          <div
                            className="flex items-center gap-3 p-2.5 rounded-lg cursor-not-allowed"
                            title="Finish the previous lesson to unlock this"
                          >
                            {badge}
                            <span className="text-sm flex-1 truncate text-ink-400">{l.title}</span>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={l.id}>
                        <Link
                          to={`/learn/${courseId}/${l.id}`}
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition ${active ? 'bg-brand-50' : 'hover:bg-ink-50'}`}
                        >
                          {badge}
                          <span className={`text-sm flex-1 truncate ${active ? 'font-semibold text-brand-700' : 'text-ink-700'}`}>{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
