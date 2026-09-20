import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listAllUsers } from '../../lib/users.js';
import { listEnrollmentsForUser } from '../../lib/enrollments.js';
import { listLessons } from '../../lib/courses.js';
import { listMyAttempts } from '../../lib/quizzes.js';
import { formatMoney, formatDateTime, statusBadgeClass } from '../../lib/format.js';
import Icon from '../../components/Icon.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function AdminStudentDetail() {
  const { uid } = useParams();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState(null);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    (async () => {
      const [users, enrollments] = await Promise.all([
        listAllUsers(),
        listEnrollmentsForUser(uid)
      ]);
      setStudent(users.find((u) => u.uid === uid) || null);

      // Pull each course's lessons so we can show exactly where they stopped.
      const withLessons = await Promise.all(
        enrollments.map(async (e) => {
          const lessons = await listLessons(e.courseId).catch(() => []);
          const done = new Set(e.completedLessons || []);
          const nextUp = lessons.find((l) => !done.has(l.id)) || null;
          return { ...e, lessons, done, nextUp };
        })
      );
      withLessons.sort((a, b) => (b.enrolledAt?.seconds || 0) - (a.enrolledAt?.seconds || 0));
      setCourses(withLessons);

      // Quiz attempts across every course this student is on.
      const all = await Promise.all(
        enrollments.map((e) => listMyAttempts(uid, e.courseId).catch(() => []))
      );
      setAttempts(all.flat());
    })();
  }, [uid]);

  if (!courses) return <Spinner />;

  const active = courses.filter((c) => c.status === 'active');
  const finished = courses.filter((c) => (c.progressPercent || 0) >= 100);

  return (
    <div>
      <Link to="/admin/users" className="text-sm text-ink-500 hover:text-ink-800 inline-flex items-center gap-1">
        <Icon name="arrow-right" size={14} className="rotate-180" /> All users
      </Link>

      {/* HEADER */}
      <div className="card p-6 mt-3 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-bold text-xl flex-shrink-0">
            {(student?.fullName || student?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-display font-bold text-ink-900">{student?.fullName || 'Unknown student'}</h1>
            <p className="text-ink-600 text-sm">{student?.email}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-ink-500">
              {student?.studentId && <span className="font-mono">{student.studentId}</span>}
              {student?.phone && <span>{student.phone}</span>}
              <span>Joined {formatDateTime(student?.createdAt)}</span>
            </div>
          </div>
          <span className={`badge ${student?.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
            {student?.role}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-ink-100">
          <Stat label="Enrolled" value={courses.length} />
          <Stat label="Active" value={active.length} />
          <Stat label="Completed" value={finished.length} />
          <Stat label="Quiz attempts" value={attempts.length} />
        </div>
      </div>

      {/* COURSES */}
      <h2 className="text-lg font-display font-bold text-ink-900 mb-3">Courses</h2>
      {courses.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          This student hasn&rsquo;t enrolled in any course yet.
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => {
            const total = c.lessons.length;
            const doneCount = c.lessons.filter((l) => c.done.has(l.id)).length;
            const percent = total ? Math.round((doneCount / total) * 100) : (c.progressPercent || 0);

            return (
              <div key={c.id} className="card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        to={`/admin/courses/${c.courseId}`}
                        className="font-display font-bold text-ink-900 hover:text-brand-700"
                      >
                        {c.courseTitle || 'Untitled course'}
                      </Link>
                      <p className="text-xs text-ink-500 mt-0.5">
                        {formatMoney(c.priceCents, c.currency)} ·{' '}
                        {c.courseMode === 'live' ? 'Live class' : 'Self-paced'} ·
                        enrolled {formatDateTime(c.enrolledAt)}
                      </p>
                    </div>
                    <span className={`badge ${statusBadgeClass(c.status)}`}>
                      {String(c.status || '').replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-ink-500">
                        {doneCount} of {total || '—'} lessons complete
                      </span>
                      <span className="font-bold text-brand-700">{percent}%</span>
                    </div>
                    <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-brand-500 to-brand-600 h-2 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-sm">
                    {total === 0 ? (
                      <span className="text-ink-500">This course has no lessons yet.</span>
                    ) : c.nextUp ? (
                      <>
                        <span className="text-ink-500">Currently on: </span>
                        <span className="font-medium text-ink-900">{c.nextUp.title}</span>
                        {c.nextUp.module && <span className="text-ink-500"> · {c.nextUp.module}</span>}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-brand-700 font-medium">
                        <Icon name="check" size={15} strokeWidth={2.5} />Finished every lesson
                      </span>
                    )}
                  </p>
                  {c.lastAccessedAt && (
                    <p className="text-xs text-ink-400 mt-1">Last active {formatDateTime(c.lastAccessedAt)}</p>
                  )}
                </div>

                {/* Lesson-by-lesson checklist */}
                {total > 0 && (
                  <details className="border-t border-ink-100">
                    <summary className="px-5 py-3 text-sm font-medium text-brand-700 cursor-pointer hover:bg-ink-50">
                      Lesson-by-lesson breakdown
                    </summary>
                    <ol className="px-5 pb-4 space-y-1">
                      {c.lessons.map((l, i) => {
                        const done = c.done.has(l.id);
                        const isCurrent = c.nextUp?.id === l.id;
                        return (
                          <li
                            key={l.id}
                            className={`flex items-center gap-3 py-1.5 ${isCurrent ? 'font-medium' : ''}`}
                          >
                            <span className={`w-6 h-6 rounded-md grid place-items-center text-[11px] font-bold flex-shrink-0 ${
                              done ? 'bg-brand-600 text-white'
                                : isCurrent ? 'bg-accent-100 text-accent-700 ring-2 ring-accent-500'
                                : 'bg-ink-100 text-ink-400'
                            }`}>
                              {done ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
                            </span>
                            <span className={`text-sm flex-1 truncate ${done ? 'text-ink-700' : isCurrent ? 'text-ink-900' : 'text-ink-400'}`}>
                              {l.title}
                            </span>
                            {isCurrent && (
                              <span className="text-[11px] font-semibold text-accent-700 uppercase tracking-wide flex-shrink-0">
                                up next
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QUIZ ATTEMPTS */}
      {attempts.length > 0 && (
        <>
          <h2 className="text-lg font-display font-bold text-ink-900 mt-8 mb-3">Recent quiz attempts</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-ink-600">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {attempts
                  .sort((a, b) => (b.attemptedAt?.seconds || 0) - (a.attemptedAt?.seconds || 0))
                  .slice(0, 15)
                  .map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5 text-ink-600">{formatDateTime(a.attemptedAt)}</td>
                      <td className="px-4 py-2.5">{a.score}% ({a.correct}/{a.total})</td>
                      <td className="px-4 py-2.5">
                        <span className={`badge ${a.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {a.passed ? 'passed' : 'failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="text-xl font-display font-bold text-ink-900 mt-0.5">{value}</p>
    </div>
  );
}
