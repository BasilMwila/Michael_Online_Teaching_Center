import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { listPublishedCourses } from '../../lib/courses.js';
import { listAllUsers } from '../../lib/users.js';
import { CAMPAIGN_SOURCES } from '../../lib/intake.js';
import {
  createRegistrationLink, listAllRegistrationLinks, registrationLinkUrl,
  setLinkActive, deleteRegistrationLink, countRegistrationsByCode
} from '../../lib/registrationLinks.js';
import { describeFieldProblem, normalizeFields } from '../../lib/formFields.js';
import { formatDateTime } from '../../lib/format.js';
import FormFieldBuilder from '../../components/FormFieldBuilder.jsx';
import Icon from '../../components/Icon.jsx';
import Spinner from '../../components/Spinner.jsx';

/**
 * Each admin generates their own registration links here. The code in the link
 * belongs to whoever pressed Generate, so the people it brings in are credited
 * to them — which is the whole point of handing different staff different links.
 */
export default function AdminRegistrationLinks() {
  const { firebaseUser, profile } = useAuth();
  const [links, setLinks] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [channel, setChannel] = useState(CAMPAIGN_SOURCES[0]);
  const [courseId, setCourseId] = useState('');
  const [fields, setFields] = useState([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [allLinks, allUsers] = await Promise.all([
      listAllRegistrationLinks().catch(() => []),
      listAllUsers().catch(() => [])
    ]);
    setLinks(allLinks);
    setUsers(allUsers);
  }

  useEffect(() => {
    refresh();
    listPublishedCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  const counts = useMemo(() => countRegistrationsByCode(users), [users]);
  const mine = (links || []).filter((l) => l.ownerId === firebaseUser?.uid);
  const theirs = (links || []).filter((l) => l.ownerId !== firebaseUser?.uid);

  async function generate() {
    if (!courseId) {
      toast.error('Choose the course this link is for');
      return;
    }
    const problem = describeFieldProblem(fields);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      const link = await createRegistrationLink({
        ownerId: firebaseUser.uid,
        ownerName: profile?.fullName || profile?.email || 'Empire Skills Academy',
        channel,
        courseId,
        courseTitle: course?.title || '',
        fields
      });
      await copy(registrationLinkUrl(link.code), 'Your new link is copied and ready to paste');
      // The questions belong to the link that was just made, not to the next one.
      setFields([]);
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Could not generate a link');
    } finally {
      setBusy(false);
    }
  }

  async function copy(url, message = 'Link copied') {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(message);
    } catch {
      toast(`Copy it from the table: ${url}`);
    }
  }

  async function toggle(link) {
    await setLinkActive(link.code, !link.active);
    toast.success(link.active ? 'Link withdrawn' : 'Link active again');
    refresh();
  }

  async function remove(link) {
    const used = counts[link.code] || 0;
    const warning = used
      ? `${link.code} brought in ${used} registration(s). Deleting the link keeps those students and keeps your credit on their records, but the link stops working. Continue?`
      : `Delete ${link.code}? Anyone who already has it will get a form with no credit to you.`;
    if (!confirm(warning)) return;
    await deleteRegistrationLink(link.code);
    toast.success('Link deleted');
    refresh();
  }

  if (!links) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Registration links</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Generate a link for a course, post it, and everyone who registers through it is credited to you.
        </p>
      </div>

      {/* GENERATE */}
      <div className="card p-5 mb-8">
        <h2 className="font-semibold text-ink-900 mb-4">Generate a link for a course</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="label">Where are you posting it?</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input">
              {CAMPAIGN_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="">Not a specific channel</option>
            </select>
          </div>
          <div>
            <label className="label">Which course is this link for?</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input">
              <option value="">Choose a course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-ink-100">
          <h3 className="font-semibold text-ink-900 text-sm">
            Extra questions on this link&rsquo;s form
            {normalizeFields(fields).length > 0 && (
              <span className="text-ink-400 font-normal"> ({normalizeFields(fields).length})</span>
            )}
          </h3>
          <p className="text-xs text-ink-500 mt-1 mb-4">
            Only people who open this link are asked them. Other links are unaffected.
          </p>
          <FormFieldBuilder fields={fields} onChange={setFields} />
        </div>

        <div className="mt-5 pt-5 border-t border-ink-100">
          <button onClick={generate} disabled={busy || !courseId} className="btn-primary whitespace-nowrap">
            {busy ? 'Generating…' : 'Generate link'}
          </button>
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Every link is for one course: whoever opens it registers and is taken straight to that
          course. Generate a separate link per course and per platform and you can see which post is
          working. The link is copied to your clipboard as soon as it is made.
        </p>
      </div>

      {/* MY LINKS */}
      <h2 className="text-lg font-display font-bold text-ink-900 mb-3">
        My links{mine.length > 0 && <span className="text-ink-400 font-normal"> ({mine.length})</span>}
      </h2>
      {mine.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          You have no links yet. Generate one above and it will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {mine.map((l) => (
            <div key={l.code} className={`card p-4 ${l.active ? '' : 'opacity-70'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-brand-800">{l.code}</span>
                    {l.channel && <span className="badge bg-gray-100 text-gray-700">{l.channel}</span>}
                    {!l.active && <span className="badge bg-amber-100 text-amber-800">withdrawn</span>}
                  </div>
                  <p className="text-xs text-ink-500 mt-1">
                    {l.courseTitle ? `For ${l.courseTitle}` : 'No course — lands on the catalogue'}
                    {l.fields?.length ? ` · ${l.fields.length} extra question${l.fields.length > 1 ? 's' : ''}` : ''}
                    {' · '}made {formatDateTime(l.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block font-display text-2xl font-bold text-ink-900">
                    {counts[l.code] || 0}
                  </span>
                  <span className="block text-xs text-ink-500">registered</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <input readOnly aria-label={`Registration link ${l.code}`}
                  value={registrationLinkUrl(l.code)}
                  onFocus={(e) => e.target.select()}
                  className="input flex-1 min-w-0 text-xs" />
                <button onClick={() => copy(registrationLinkUrl(l.code))} className="btn-secondary text-xs">
                  Copy
                </button>
                <a href={registrationLinkUrl(l.code)} target="_blank" rel="noopener noreferrer"
                  className="text-brand-700 text-xs hover:underline px-1">Preview</a>
                <button onClick={() => toggle(l)} className="text-ink-600 text-xs hover:underline px-1">
                  {l.active ? 'Withdraw' : 'Reactivate'}
                </button>
                <button onClick={() => remove(l)} className="text-red-600 text-xs hover:underline px-1">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EVERYONE ELSE'S — so the team can see which posts are working */}
      {theirs.length > 0 && (
        <>
          <h2 className="text-lg font-display font-bold text-ink-900 mt-10 mb-3">Other admins&rsquo; links</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-ink-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Lands on</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Made</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {theirs.map((l) => (
                  <tr key={l.code} className={l.active ? '' : 'text-ink-400'}>
                    <td className="px-4 py-3 font-mono">{l.code}</td>
                    <td className="px-4 py-3">{l.ownerName || '—'}</td>
                    <td className="px-4 py-3">{l.channel || '—'}</td>
                    <td className="px-4 py-3">{l.courseTitle || 'Catalogue'}</td>
                    <td className="px-4 py-3 font-semibold">{counts[l.code] || 0}</td>
                    <td className="px-4 py-3 text-ink-600">{formatDateTime(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-ink-500 mt-6 flex items-start gap-2">
        <Icon name="shield" size={14} className="mt-0.5 shrink-0" />
        Counted from the students&rsquo; own records, not from clicks — so the number is people who
        actually registered, and it stays correct even if a link is later withdrawn.
      </p>
    </div>
  );
}
