import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { auditAccess, runAccessBackfill } from '../lib/courseAccess.js';
import Icon from './Icon.jsx';

/**
 * Shown on the admin dashboard only while there is something to backfill.
 *
 * Course content is locked by security rules that read a per-student access
 * record. Students who were already studying before those records existed have
 * none, so this fills them in — and builds each course's public outline, which
 * is what visitors see in place of the locked lesson list. Once everything is
 * in place the card reports it and can be dismissed.
 */
export default function AccessBackfillCard() {
  const [audit, setAudit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);

  async function check() {
    try {
      setAudit(await auditAccess());
    } catch {
      setAudit(null); // Not an admin, or rules not published yet — stay quiet.
    }
  }

  useEffect(() => { check(); }, []);

  async function run() {
    setBusy(true);
    setProgress({ done: 0, total: 0, label: 'starting' });
    try {
      const result = await runAccessBackfill(setProgress);
      toast.success(`${result.granted} student(s) granted access, ${result.outlines} outline(s) built`);
      await check();
    } catch (err) {
      toast.error(err.message || 'Backfill failed — nothing was lost, you can run it again');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (!audit) return null;

  if (audit.ready) {
    return (
      <div className="card p-5 mb-6 border-l-4 border-emerald-500">
        <div className="flex items-start gap-3">
          <span className="icon-tile bg-emerald-100 text-emerald-700 shrink-0">
            <Icon name="shield" size={20} />
          </span>
          <div>
            <h3 className="font-semibold text-ink-900">Course access is locked down</h3>
            <p className="text-sm text-ink-600 mt-1">
              All {audit.entitled} active enrollment(s) hold an access record, and every course has a
              public outline. Lesson content is readable only by students you have approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 mb-6 border-l-4 border-accent-500">
      <div className="flex items-start gap-3">
        <span className="icon-tile bg-accent-100 text-accent-700 shrink-0">
          <Icon name="lock" size={20} />
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-ink-900">Finish locking course content</h3>
          <p className="text-sm text-ink-600 mt-1">
            {audit.missingAccess.length > 0 && (
              <>{audit.missingAccess.length} student(s) already studying need an access record. </>
            )}
            {audit.missingOutline.length > 0 && (
              <>{audit.missingOutline.length} course(s) need their public outline built. </>
            )}
            Run this once <strong>before</strong> the tightened rules are published, so nobody who has
            already paid loses the course they are part-way through.
          </p>
          {progress && (
            <p className="text-xs text-ink-500 mt-2">
              {progress.done}/{progress.total} — {progress.label}
            </p>
          )}
          <button onClick={run} disabled={busy} className="btn btn-primary mt-4">
            {busy ? 'Working…' : 'Run backfill'}
          </button>
        </div>
      </div>
    </div>
  );
}
