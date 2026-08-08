import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCourse, listLessons } from '../lib/courses.js';
import { applyForCourse, getEnrollmentForCourse } from '../lib/enrollments.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../lib/format.js';
import Spinner from '../components/Spinner.jsx';
import Icon from '../components/Icon.jsx';

export default function CourseDetail() {
  const { courseId } = useParams();
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const c = await getCourse(courseId);
        setCourse(c);
        if (c) {
          const ls = await listLessons(courseId);
          setLessons(ls);
          if (firebaseUser) {
            const en = await getEnrollmentForCourse(firebaseUser.uid, courseId);
            setEnrollment(en);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, firebaseUser]);

  if (loading) return <Spinner />;
  if (!course) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Course not found</h2>
        <Link to="/courses" className="btn-primary">Browse courses</Link>
      </div>
    );
  }

  async function handleApply() {
    if (!firebaseUser) {
      toast('Please sign in to enroll', { icon: '👋' });
      navigate('/login', { state: { from: `/courses/${courseId}` } });
      return;
    }
    setBusy(true);
    try {
      const enrollmentId = await applyForCourse({
        userId: firebaseUser.uid,
        courseId,
        courseTitle: course.title,
        courseMode: course.mode,
        priceCents: course.priceCents,
        currency: course.currency || 'USD'
      });
      toast.success('Enrolled — now complete payment to unlock access');
      navigate(`/pay/${enrollmentId}`);
    } catch (e) {
      toast.error(e.message || 'Could not enroll');
    } finally {
      setBusy(false);
    }
  }

  const isActive = enrollment?.status === 'active';
  const isPending = enrollment?.status === 'pending_payment';

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="max-w-7xl mx-auto container-px py-12 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {course.category && <span className="badge bg-white/10 text-white">{course.category}</span>}
              <span className="badge bg-white/10 text-white">{course.mode === 'live' ? 'Live class' : 'Self-paced'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold mb-4">{course.title}</h1>
            <p className="text-lg text-brand-50/90 max-w-2xl">{course.shortDescription || course.description}</p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-brand-100">
              {course.instructorName && <span className="inline-flex items-center gap-1.5"><Icon name="users" size={14} />{course.instructorName}</span>}
              {course.durationHours && <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={14} />{course.durationHours} hours</span>}
              <span className="inline-flex items-center gap-1.5"><Icon name="book-open" size={14} />{lessons.length} lessons</span>
            </div>
          </div>
          <aside className="card text-gray-900 p-6 h-fit">
            <div className="text-3xl font-bold text-brand-700 mb-1">{formatMoney(course.priceCents, course.currency || 'USD')}</div>
            <p className="text-sm text-gray-500 mb-5">One-time payment · Lifetime access</p>
            {isActive ? (
              <Link to={`/learn/${courseId}`} className="btn-primary w-full">Continue learning →</Link>
            ) : isPending ? (
              <Link to={`/pay/${enrollment.id}`} className="btn-primary w-full">Complete payment</Link>
            ) : (
              <button onClick={handleApply} disabled={busy} className="btn-primary w-full">
                {busy ? 'Enrolling…' : firebaseUser ? 'Apply for this course' : 'Sign in to enroll'}
              </button>
            )}
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
              <li>✓ {course.mode === 'live' ? 'WhatsApp group access after payment' : 'Account-gated video library'}</li>
              <li>✓ Quizzes after each lesson</li>
              <li>✓ Mobile, tablet & PC</li>
              <li>✓ Certificate of completion</li>
            </ul>
          </aside>
        </div>
      </section>

      <div className="max-w-7xl mx-auto container-px py-12 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="text-2xl font-display font-bold mb-3">About this course</h2>
            <div className="prose prose-gray max-w-none whitespace-pre-line text-gray-700 leading-relaxed">
              {course.description}
            </div>
          </section>

          {course.learningOutcomes?.length > 0 && (
            <section>
              <h2 className="text-2xl font-display font-bold mb-3">What you'll learn</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {course.learningOutcomes.map((o, i) => (
                  <li key={i} className="flex gap-2 text-gray-700">
                    <span className="text-brand-600">✓</span>{o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-display font-bold mb-3">Lessons</h2>
            {lessons.length === 0 ? (
              <p className="text-gray-500">Lesson list will appear here when the course launches.</p>
            ) : (
              <ol className="card divide-y">
                {lessons.map((l, i) => (
                  <li key={l.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">{i + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{l.title}</p>
                        {l.durationMinutes && <p className="text-xs text-gray-500">{l.durationMinutes} min</p>}
                      </div>
                    </div>
                    {!isActive && <Icon name="lock" size={14} className="text-gray-400" />}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold mb-2">How enrollment works</h3>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Click apply for this course</li>
              <li>Pay via bank transfer & upload proof</li>
              <li>Admin confirms within 1 business day</li>
              <li>{course.mode === 'live' ? 'You\'re added to the WhatsApp class group' : 'Course unlocks in your dashboard'}</li>
            </ol>
          </div>
          {profile?.studentId && (
            <div className="card p-5 bg-brand-50 border-brand-100">
              <p className="text-xs text-brand-700 font-semibold uppercase tracking-wide">Your student ID</p>
              <p className="font-bold text-brand-900 text-lg">{profile.studentId}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
