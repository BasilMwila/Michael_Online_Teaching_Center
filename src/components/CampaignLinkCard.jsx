import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { listPublishedCourses } from '../lib/courses.js';
import {
  createRegistrationLink, listMyRegistrationLinks, registrationLinkUrl
} from '../lib/registrationLinks.js';
import Icon from './Icon.jsx';

/**
 * Generate a registration link for a course, one click from signing in.
 *
 * Every link belongs to one course and to the admin who made it. Picking a
 * course you already have a link for shows that link rather than minting a
 * second code for the same thing — deliberately making more than one per
 * course, say for different platforms, is what the Registration links page is
 * for.
 */
export default function CampaignLinkCard() {
  const { firebaseUser, profile } = useAuth();
  const [links, setLinks] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!firebaseUser) return;
    listMyRegistrationLinks(firebaseUser.uid).then(setLinks).catch(() => setLinks([]));
  }, [firebaseUser?.uid]);

  useEffect(() => {
    listPublishedCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  const existing = courseId
    ? (links || []).find((l) => l.courseId === courseId && l.active)
    : null;
  const url = existing ? registrationLinkUrl(existing.code) : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Registration link copied');
    } catch {
      input.current?.focus();
      input.current?.select();
      toast('Select and copy the link below.');
    }
  }

  async function generate() {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setBusy(true);
    try {
      const link = await createRegistrationLink({
        ownerId: firebaseUser.uid,
        ownerName: profile?.fullName || profile?.email || 'Empire Skills Academy',
        courseId: course.id,
        courseTitle: course.title || ''
      });
      setLinks((s) => [link, ...(s || [])]);
      try {
        await navigator.clipboard.writeText(registrationLinkUrl(link.code));
        toast.success('Link generated and copied');
      } catch {
        toast.success('Link generated');
      }
    } catch (err) {
      toast.error(err.message || 'Could not generate a link');
    } finally {
      setBusy(false);
    }
  }

  if (!links) return null;

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="icon-tile bg-brand-100 text-brand-700 shrink-0">
          <Icon name="send" size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-ink-900">Registration link for a course</h2>
          <p className="text-sm text-ink-600 mt-1">
            Put it in your posts. Whoever opens it registers, lands on that course, and is credited
            to you.
          </p>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mt-4">
            <div>
              <label className="label">Which course?</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input">
                <option value="">Choose a course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            {!existing && (
              <button onClick={generate} disabled={busy || !courseId} className="btn-primary whitespace-nowrap">
                {busy ? 'Generating…' : 'Generate link'}
              </button>
            )}
          </div>

          {existing && (
            <>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <input ref={input} readOnly aria-label="Registration link" value={url}
                  onFocus={(e) => e.target.select()} className="input flex-1 min-w-0 text-xs" />
                <button type="button" onClick={copyLink} className="btn-secondary text-xs">Copy link</button>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-brand-700 text-xs hover:underline px-1">Preview</a>
              </div>
              <p className="text-xs text-ink-500 mt-2.5">
                Code <span className="font-mono font-semibold">{existing.code}</span>
                {existing.channel ? ` · tagged ${existing.channel}` : ''}
                {' · '}
                <Link to="/admin/links" className="text-brand-700 hover:underline">
                  make another for a different platform, or see how many each has brought in
                </Link>
              </p>
            </>
          )}

          {!existing && (
            <p className="text-xs text-ink-500 mt-3">
              {courseId
                ? 'You have no link for this course yet.'
                : 'Pick a course to get its link, or make one yourself on the '}
              {!courseId && <Link to="/admin/links" className="text-brand-700 hover:underline">Registration links page</Link>}
              {!courseId && '.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
